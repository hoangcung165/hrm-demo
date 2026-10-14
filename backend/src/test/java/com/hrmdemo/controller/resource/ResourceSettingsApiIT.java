package com.hrmdemo.controller.resource;

import static org.assertj.core.api.Assertions.assertThat;

import javax.sql.DataSource;

import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** Ngưỡng nguồn lực API (HRM-17/BE-1) against real PostgreSQL. */
@IntegrationTest
class ResourceSettingsApiIT {

    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    DataSource dataSource;

    JdbcTemplate jdbc;
    String admin;
    String director;
    String pm;
    String employee;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        jdbc.update("delete from resource_setting");
        admin = testAccounts.adminBearer(mvc);
        director = testAccounts.bearer(mvc, testAccounts.create("Phạm Quốc Bảo", "bao-" + java.util.UUID.randomUUID() + "@example.com",
                Role.DIRECTOR, Role.EMPLOYEE));
        pm = testAccounts.bearer(mvc, testAccounts.create(Role.PROJECT_MANAGER, Role.EMPLOYEE));
        employee = testAccounts.bearer(mvc, testAccounts.create(Role.EMPLOYEE));
    }

    @AfterEach
    void cleanUp() {
        jdbc.update("delete from resource_setting");
    }

    @Test
    void untilTheCompanySavesItsOwnTheDefaultsAreInForce() {
        MvcTestResult response = get(pm);

        assertThat(response).hasStatusOk();
        assertThat(response).bodyJson().extractingPath("$.benchPercent").isEqualTo(50);
        assertThat(response).bodyJson().extractingPath("$.nearFullPercent").isEqualTo(90);
        assertThat(response).bodyJson().extractingPath("$.endingWeeks").isEqualTo(4);
        assertThat(response).bodyJson().extractingPath("$.customized").isEqualTo(false);
        assertThat(response).bodyJson().extractingPath("$.canEdit").isEqualTo(false);
    }

    @Test
    void theDirectorSavesAndEveryoneWhoMayViewSeesThemWithWhoSavedThem() {
        MvcTestResult saved = put(director, "{\"benchPercent\":40,\"nearFullPercent\":85,\"endingWeeks\":6}");

        assertThat(saved).hasStatusOk();
        assertThat(saved).bodyJson().extractingPath("$.customized").isEqualTo(true);
        assertThat(saved).bodyJson().extractingPath("$.updatedByName").isEqualTo("Phạm Quốc Bảo");
        assertThat(saved).bodyJson().extractingPath("$.canEdit").isEqualTo(true);

        MvcTestResult seen = get(pm);
        assertThat(seen).bodyJson().extractingPath("$.benchPercent").isEqualTo(40);
        assertThat(seen).bodyJson().extractingPath("$.nearFullPercent").isEqualTo(85);
        assertThat(seen).bodyJson().extractingPath("$.endingWeeks").isEqualTo(6);
        assertThat(seen).bodyJson().extractingPath("$.updatedByName").isEqualTo("Phạm Quốc Bảo");
        assertThat(jdbc.queryForObject("select count(*) from resource_setting", Integer.class)).isEqualTo(1);
    }

    @Test
    void savingAgainReplacesTheRowAndSavingTheDefaultsRemovesIt() {
        put(director, "{\"benchPercent\":40,\"nearFullPercent\":85,\"endingWeeks\":6}");
        put(admin, "{\"benchPercent\":60,\"nearFullPercent\":95,\"endingWeeks\":8}");
        assertThat(jdbc.queryForObject("select count(*) from resource_setting", Integer.class)).isEqualTo(1);
        assertThat(get(pm)).bodyJson().extractingPath("$.benchPercent").isEqualTo(60);

        MvcTestResult defaults = put(admin, "{\"benchPercent\":50,\"nearFullPercent\":90,\"endingWeeks\":4}");

        assertThat(defaults).hasStatusOk();
        assertThat(defaults).bodyJson().extractingPath("$.customized").isEqualTo(false);
        assertThat(jdbc.queryForObject("select count(*) from resource_setting", Integer.class)).isZero();
    }

    @Test
    void restoreDefaultsRemovesTheOwnThresholds() {
        put(director, "{\"benchPercent\":40,\"nearFullPercent\":85,\"endingWeeks\":6}");

        MvcTestResult restored = mvc.delete().uri("/api/resource-settings")
                .header(HttpHeaders.AUTHORIZATION, director).exchange();

        assertThat(restored).hasStatusOk();
        assertThat(restored).bodyJson().extractingPath("$.benchPercent").isEqualTo(50);
        assertThat(restored).bodyJson().extractingPath("$.customized").isEqualTo(false);
        assertThat(jdbc.queryForObject("select count(*) from resource_setting", Integer.class)).isZero();
    }

    @Test
    void everyFailingFieldIsReportedAtOnce() {
        MvcTestResult invalid = put(director, "{\"benchPercent\":95,\"nearFullPercent\":90,\"endingWeeks\":0}");

        assertThat(invalid).hasStatus(400);
        assertThat(invalid).bodyJson().extractingPath("$.code").isEqualTo("validation.invalid");
        assertThat(invalid).bodyJson().extractingPath("$.errors[*].field").asArray()
                .containsExactly("endingWeeks", "benchPercent");
        assertThat(invalid).bodyJson().extractingPath("$.errors[*].code").asArray()
                .containsExactly("out_of_range", "not_below_near_full");

        MvcTestResult missing = put(director, "{}");
        assertThat(missing).hasStatus(400);
        assertThat(missing).bodyJson().extractingPath("$.errors[*].code").asArray()
                .containsExactly("required", "required", "required");
        assertThat(jdbc.queryForObject("select count(*) from resource_setting", Integer.class)).isZero();
    }

    @Test
    void aPmMayReadButNotChangeAndAnEmployeeMayNotEvenRead() {
        assertThat(put(pm, "{\"benchPercent\":40,\"nearFullPercent\":85,\"endingWeeks\":6}")).hasStatus(403);
        assertThat(mvc.delete().uri("/api/resource-settings").header(HttpHeaders.AUTHORIZATION, pm).exchange())
                .hasStatus(403);
        assertThat(get(employee)).hasStatus(403);
        assertThat(put(employee, "{\"benchPercent\":40,\"nearFullPercent\":85,\"endingWeeks\":6}")).hasStatus(403);
        assertThat(mvc.get().uri("/api/resource-settings").exchange()).hasStatus(401);
    }

    MvcTestResult get(String bearer) {
        return mvc.get().uri("/api/resource-settings").header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    MvcTestResult put(String bearer, String body) {
        return mvc.put().uri("/api/resource-settings").header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON).content(body).exchange();
    }
}
