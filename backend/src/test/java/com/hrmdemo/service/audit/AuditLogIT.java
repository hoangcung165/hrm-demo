package com.hrmdemo.service.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import javax.sql.DataSource;

import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * Audit log foundation (HRM-13/BE-1) against real PostgreSQL: a change of the thresholds writes one record with who,
 * when and before → after, and the database refuses to alter or delete any record. Audit records cannot be deleted,
 * so the tests count the records they add instead of cleaning up.
 */
@IntegrationTest
class AuditLogIT {

    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    DataSource dataSource;

    JdbcTemplate jdbc;
    String director;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        jdbc.update("delete from resource_setting");
        director = testAccounts.bearer(mvc, testAccounts.create("Phạm Quốc Bảo",
                "bao-" + UUID.randomUUID() + "@example.com", Role.DIRECTOR, Role.EMPLOYEE));
    }

    @AfterEach
    void cleanUp() {
        jdbc.update("delete from resource_setting");
    }

    int records() {
        return jdbc.queryForObject("select count(*) from audit_log where entity_type = 'RESOURCE_SETTING'",
                Integer.class);
    }

    Map<String, Object> latest() {
        return jdbc.queryForMap("""
                select actor_name, action, entity_id, summary, before_values::text as before_values,
                       after_values::text as after_values, occurred_at
                from audit_log where entity_type = 'RESOURCE_SETTING' order by occurred_at desc limit 1""");
    }

    MvcTestResult put(String body) {
        return mvc.put().uri("/api/resource-settings").header(HttpHeaders.AUTHORIZATION, director)
                .contentType(MediaType.APPLICATION_JSON).content(body).exchange();
    }

    @Test
    void savingTheThresholdsWritesOneRecordWithWhoWhenAndTheChangedValuesBeforeAndAfter() {
        int before = records();

        assertThat(put("{\"benchPercent\":40,\"nearFullPercent\":90,\"endingWeeks\":6}")).hasStatusOk();

        assertThat(records()).isEqualTo(before + 1);
        Map<String, Object> record = latest();
        assertThat(record.get("actor_name")).isEqualTo("Phạm Quốc Bảo");
        assertThat(record.get("action")).isEqualTo("UPDATE");
        assertThat(record.get("summary")).isEqualTo("Resource thresholds changed");
        assertThat(record.get("occurred_at")).isNotNull();
        assertThat((String) record.get("before_values")).contains("\"benchPercent\": 50").contains("\"endingWeeks\": 4")
                .doesNotContain("nearFullPercent");
        assertThat((String) record.get("after_values")).contains("\"benchPercent\": 40").contains("\"endingWeeks\": 6")
                .doesNotContain("nearFullPercent");
    }

    @Test
    void savingTheSameValuesAgainWritesNothing() {
        put("{\"benchPercent\":40,\"nearFullPercent\":85,\"endingWeeks\":6}");
        int after = records();

        assertThat(put("{\"benchPercent\":40,\"nearFullPercent\":85,\"endingWeeks\":6}")).hasStatusOk();

        assertThat(records()).isEqualTo(after);
    }

    @Test
    void aRefusedChangeLeavesNoRecord() {
        int before = records();

        assertThat(put("{\"benchPercent\":95,\"nearFullPercent\":90,\"endingWeeks\":0}")).hasStatus4xxClientError();

        assertThat(records()).isEqualTo(before);
    }

    @Test
    void restoringTheDefaultsIsRecordedAsWell() {
        put("{\"benchPercent\":40,\"nearFullPercent\":85,\"endingWeeks\":6}");
        int before = records();

        assertThat(mvc.delete().uri("/api/resource-settings").header(HttpHeaders.AUTHORIZATION, director).exchange())
                .hasStatusOk();

        assertThat(records()).isEqualTo(before + 1);
        assertThat(latest().get("summary")).isEqualTo("Resource thresholds restored to the defaults");
    }

    @Test
    void theDatabaseRefusesToUpdateOrDeleteARecord() {
        put("{\"benchPercent\":40,\"nearFullPercent\":85,\"endingWeeks\":6}");
        int count = records();

        assertThatThrownBy(() -> jdbc.update("update audit_log set summary = 'edited'"))
                .isInstanceOf(DataAccessException.class).hasMessageContaining("append-only");
        assertThatThrownBy(() -> jdbc.update("delete from audit_log"))
                .isInstanceOf(DataAccessException.class).hasMessageContaining("append-only");

        assertThat(records()).isEqualTo(count);
        List<String> summaries = jdbc.queryForList("select distinct summary from audit_log", String.class);
        assertThat(summaries).doesNotContain("edited");
    }
}
