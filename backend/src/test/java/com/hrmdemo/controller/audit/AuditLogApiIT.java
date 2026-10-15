package com.hrmdemo.controller.audit;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import javax.sql.DataSource;

import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * Audit log query API (HRM-13/BE-2) against real PostgreSQL. Audit records cannot be deleted, so each test makes its
 * own person (a fresh actor id) and filters by it instead of cleaning up.
 */
@IntegrationTest
class AuditLogApiIT {

    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    DataSource dataSource;

    JdbcTemplate jdbc;
    String admin;
    String director;
    UUID actor;
    String actorName;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        admin = testAccounts.adminBearer(mvc);
        director = testAccounts.bearer(mvc, testAccounts.create(Role.DIRECTOR, Role.EMPLOYEE));
        actor = UUID.randomUUID();
        actorName = "Người sửa " + actor;
    }

    UUID record(String entityType, UUID entityId, UUID by, String name, String action, String summary, Instant at,
            String before, String after) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into audit_log (id, legal_entity_id, occurred_at, actor_id, actor_name, action, entity_type,
                                       entity_id, summary, before_values, after_values)
                select ?, id, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb from legal_entity""",
                id, java.sql.Timestamp.from(at), by, name, action, entityType, entityId, summary, before, after);
        return id;
    }

    UUID record(String entityType, Instant at, String summary) {
        return record(entityType, UUID.randomUUID(), actor, actorName, "UPDATE", summary, at,
                "{\"benchPercent\": 50}", "{\"benchPercent\": 40}");
    }

    MvcTestResult get(String bearer, String uri) {
        return mvc.get().uri(uri).header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    @Test
    void theListIsNewestFirstAndCarriesTheLabelOfTheKind() {
        Instant now = Instant.now();
        record("RESOURCE_SETTING", now.minusSeconds(300), "oldest");
        record("RESOURCE_SETTING", now.minusSeconds(100), "newest");
        record("RESOURCE_SETTING", now.minusSeconds(200), "middle");

        MvcTestResult response = get(admin, "/api/audit-logs?actorId=" + actor);

        assertThat(response).hasStatusOk();
        assertThat(response).bodyJson().extractingPath("$.total").isEqualTo(3);
        assertThat(response).bodyJson().extractingPath("$.items[*].summary")
                .isEqualTo(List.of("newest", "middle", "oldest"));
        assertThat(response).bodyJson().extractingPath("$.items[0].entityLabel").isEqualTo("Resource thresholds");
        assertThat(response).bodyJson().extractingPath("$.items[0].actorName").isEqualTo(actorName);
        assertThat(response).bodyJson().extractingPath("$.items[0].action").isEqualTo("UPDATE");
    }

    @Test
    void theFiltersApplyTogether() {
        Instant now = Instant.now();
        UUID thing = UUID.randomUUID();
        record("RESOURCE_SETTING", thing, actor, actorName, "UPDATE", "match", now, null, null);
        record("RESOURCE_SETTING", UUID.randomUUID(), actor, actorName, "UPDATE", "other record", now, null, null);
        record("OLD_KIND", thing, actor, actorName, "UPDATE", "other kind", now, null, null);
        record("RESOURCE_SETTING", thing, UUID.randomUUID(), "Someone else", "UPDATE", "other person", now, null, null);

        String uri = "/api/audit-logs?entityType=RESOURCE_SETTING&entityId=" + thing + "&actorId=" + actor;

        assertThat(get(director, uri)).bodyJson().extractingPath("$.items[*].summary").isEqualTo(List.of("match"));
        assertThat(get(director, "/api/audit-logs?actorId=" + actor)).bodyJson().extractingPath("$.total")
                .isEqualTo(3);
    }

    @Test
    void theTimeRangeUsesWholeDaysOfTheCompanyAndBothEndsCount() {
        ZoneId zone = ZoneId.systemDefault();
        LocalDate day = LocalDate.of(2024, 3, 10);
        record("RESOURCE_SETTING", day.minusDays(1).atTime(23, 59).atZone(zone).toInstant(), "day before");
        record("RESOURCE_SETTING", day.atStartOfDay(zone).toInstant(), "first moment");
        record("RESOURCE_SETTING", day.atTime(23, 59).atZone(zone).toInstant(), "last minute");
        record("RESOURCE_SETTING", day.plusDays(1).atStartOfDay(zone).toInstant(), "day after");

        MvcTestResult one = get(admin, "/api/audit-logs?actorId=" + actor + "&from=" + day + "&to=" + day);
        assertThat(one).bodyJson().extractingPath("$.items[*].summary")
                .isEqualTo(List.of("last minute", "first moment"));

        MvcTestResult open = get(admin, "/api/audit-logs?actorId=" + actor + "&from=" + day);
        assertThat(open).bodyJson().extractingPath("$.total").isEqualTo(3);
        MvcTestResult until = get(admin, "/api/audit-logs?actorId=" + actor + "&to=" + day);
        assertThat(until).bodyJson().extractingPath("$.total").isEqualTo(3);
    }

    @Test
    void theSearchFindsTheSummaryOrTheNameWhateverTheCase() {
        Instant now = Instant.now();
        record("RESOURCE_SETTING", now, "Bench threshold LOWERED");

        assertThat(get(admin, "/api/audit-logs?actorId=" + actor + "&q=lowered")).bodyJson()
                .extractingPath("$.total").isEqualTo(1);
        assertThat(get(admin, "/api/audit-logs?actorId=" + actor + "&q=NGƯỜI SỬA")).bodyJson()
                .extractingPath("$.total").isEqualTo(1);
        assertThat(get(admin, "/api/audit-logs?actorId=" + actor + "&q=nothing like this")).bodyJson()
                .extractingPath("$.total").isEqualTo(0);
        // A wildcard typed by the user is a plain character.
        assertThat(get(admin, "/api/audit-logs?actorId=" + actor + "&q=%25")).bodyJson()
                .extractingPath("$.total").isEqualTo(0);
    }

    @Test
    void pagingIsStableEvenWhenRecordsShareTheSameMoment() {
        Instant same = Instant.now().minusSeconds(60);
        for (int i = 0; i < 5; i++) {
            record("RESOURCE_SETTING", same, "same moment " + i);
        }

        List<Object> seen = new java.util.ArrayList<>();
        for (int page = 0; page < 3; page++) {
            MvcTestResult response = get(admin, "/api/audit-logs?actorId=" + actor + "&size=2&page=" + page);
            assertThat(response).bodyJson().extractingPath("$.total").isEqualTo(5);
            seen.addAll(readIds(response));
        }

        assertThat(seen).hasSize(5).doesNotHaveDuplicates();
    }

    private List<String> readIds(MvcTestResult response) {
        try {
            com.fasterxml.jackson.databind.JsonNode items = new com.fasterxml.jackson.databind.ObjectMapper()
                    .readTree(response.getResponse().getContentAsString()).get("items");
            List<String> ids = new java.util.ArrayList<>();
            items.forEach(item -> ids.add(item.get("id").asText()));
            return ids;
        } catch (java.io.IOException e) {
            throw new IllegalStateException(e);
        }
    }

    @Test
    void oneRecordShowsTheValuesBeforeAndAfter() {
        UUID id = record("RESOURCE_SETTING", UUID.randomUUID(), actor, actorName, "UPDATE", "changed",
                Instant.now(), "{\"benchPercent\": 50}", "{\"benchPercent\": 40}");

        MvcTestResult response = get(director, "/api/audit-logs/" + id);

        assertThat(response).hasStatusOk();
        assertThat(response).bodyJson().extractingPath("$.before.benchPercent").isEqualTo(50);
        assertThat(response).bodyJson().extractingPath("$.after.benchPercent").isEqualTo(40);
        assertThat(response).bodyJson().extractingPath("$.entityLabel").isEqualTo("Resource thresholds");
    }

    @Test
    void aKindThatIsNoLongerRegisteredKeepsItsKeyAsTheLabel() {
        UUID id = record("OLD_KIND", UUID.randomUUID(), actor, actorName, "DELETE", "gone", Instant.now(),
                "{\"x\": 1}", null);

        MvcTestResult response = get(admin, "/api/audit-logs/" + id);

        assertThat(response).bodyJson().extractingPath("$.entityLabel").isEqualTo("OLD_KIND");
        assertThat(response).bodyJson().extractingPath("$.after").isNull();
    }

    @Test
    void anUnknownRecordIsNotFound() {
        assertThat(get(admin, "/api/audit-logs/" + UUID.randomUUID())).hasStatus(404);
    }

    @Test
    void theKindsToFilterByAreTheRegisteredOnes() {
        MvcTestResult response = get(director, "/api/audit-logs/entity-types");

        assertThat(response).hasStatusOk();
        assertThat(response).bodyJson().extractingPath("$[?(@.key=='RESOURCE_SETTING')].label")
                .isEqualTo(List.of("Resource thresholds"));
    }

    @Test
    void thePeopleToFilterByAppearOnceEachWithTheirName() {
        Instant now = Instant.now();
        record("RESOURCE_SETTING", now.minusSeconds(20), "first");
        record("RESOURCE_SETTING", now.minusSeconds(10), "second");
        UUID other = UUID.randomUUID();
        record("RESOURCE_SETTING", UUID.randomUUID(), other, "Người khác " + other, "UPDATE", "by another", now, null,
                null);
        String nobody = "nobody " + UUID.randomUUID();
        record("RESOURCE_SETTING", UUID.randomUUID(), null, null, "UPDATE", nobody, now, null, null);

        MvcTestResult response = get(director, "/api/audit-logs/actors");

        assertThat(response).hasStatusOk();
        assertThat(response).bodyJson().extractingPath("$[?(@.id=='" + actor + "')].name")
                .isEqualTo(List.of(actorName));
        assertThat(response).bodyJson().extractingPath("$[?(@.id=='" + other + "')].name")
                .isEqualTo(List.of("Người khác " + other));
        assertThat(response).bodyJson().extractingPath("$[?(@.id==null)]").isEqualTo(List.of());
    }

    @Test
    void invalidParametersAreRefused() {
        assertThat(get(admin, "/api/audit-logs?page=-1")).hasStatus(400);
        assertThat(get(admin, "/api/audit-logs?size=0")).hasStatus(400);
        assertThat(get(admin, "/api/audit-logs?size=101")).hasStatus(400);
        assertThat(get(admin, "/api/audit-logs?from=2024-03-10&to=2024-03-09")).hasStatus(400);
        assertThat(get(admin, "/api/audit-logs?from=not-a-date")).hasStatus(400);
        assertThat(get(admin, "/api/audit-logs?actorId=not-an-id")).hasStatus(400);
    }

    @Test
    void everyoneWithoutAuditViewGets403AndNoSignInGets401() {
        UUID id = record("RESOURCE_SETTING", Instant.now(), "secret");
        for (Role role : List.of(Role.HR, Role.LINE_MANAGER, Role.PROJECT_MANAGER, Role.ACCOUNTANT, Role.EMPLOYEE)) {
            String bearer = testAccounts.bearer(mvc, testAccounts.create(role, Role.EMPLOYEE));
            assertThat(get(bearer, "/api/audit-logs")).as(role + " list").hasStatus(403);
            assertThat(get(bearer, "/api/audit-logs/" + id)).as(role + " one").hasStatus(403);
            assertThat(get(bearer, "/api/audit-logs/entity-types")).as(role + " kinds").hasStatus(403);
            assertThat(get(bearer, "/api/audit-logs/actors")).as(role + " people").hasStatus(403);
        }
        assertThat(mvc.get().uri("/api/audit-logs").exchange()).hasStatus(401);
    }

    @Test
    void thereIsNoWayToWriteARecordThroughTheApi() {
        UUID id = record("RESOURCE_SETTING", Instant.now(), "untouchable");
        String body = "{\"summary\":\"forged\"}";

        for (String uri : List.of("/api/audit-logs", "/api/audit-logs/" + id)) {
            assertThat(mvc.post().uri(uri).header(HttpHeaders.AUTHORIZATION, admin)
                    .contentType(MediaType.APPLICATION_JSON).content(body).exchange()).as("POST " + uri)
                    .hasStatus(405);
            assertThat(mvc.put().uri(uri).header(HttpHeaders.AUTHORIZATION, admin)
                    .contentType(MediaType.APPLICATION_JSON).content(body).exchange()).as("PUT " + uri)
                    .hasStatus(405);
            assertThat(mvc.patch().uri(uri).header(HttpHeaders.AUTHORIZATION, admin)
                    .contentType(MediaType.APPLICATION_JSON).content(body).exchange()).as("PATCH " + uri)
                    .hasStatus(405);
            assertThat(mvc.delete().uri(uri).header(HttpHeaders.AUTHORIZATION, admin).exchange())
                    .as("DELETE " + uri).hasStatus(405);
        }
        assertThat(jdbc.queryForObject("select summary from audit_log where id = ?", String.class, id))
                .isEqualTo("untouchable");
    }
}
