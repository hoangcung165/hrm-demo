package com.hrmdemo.controller.employee;

import static org.assertj.core.api.Assertions.assertThat;

import com.hrmdemo.entity.SearchText;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.entity.orgunit.OrgUnit;
import com.hrmdemo.entity.orgunit.OrgUnitType;
import com.hrmdemo.repository.orgunit.OrgUnitRepository;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import com.hrmdemo.support.TestEmployees;
import com.jayway.jsonpath.JsonPath;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

@IntegrationTest
class ContractListApiIT {
    @Autowired MockMvcTester mvc;
    @Autowired TestAccounts accounts;
    @Autowired TestEmployees employees;
    @Autowired OrgUnitRepository units;
    @Autowired DataSource dataSource;
    @Autowired Clock clock;
    final List<OrgUnit> createdUnits = new ArrayList<>();
    final List<UUID> overrides = new ArrayList<>();
    JdbcTemplate jdbc;
    LocalDate today;
    String admin;
    UUID ann, binh;
    UUID ended, open, expiring, upcoming, running;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        employees.deleteAll();
        today = LocalDate.ofInstant(clock.instant(), ZoneId.of("Asia/Ho_Chi_Minh"));
        admin = accounts.adminBearer(mvc);
        ann = employees.create("Trần Thị Ánh Fictional", null);
        binh = employees.create("Lê Văn Bình Fictional", null);
        // The helper stores the name as typed; real Employees store it through SearchText (no accents).
        for (UUID id : List.of(ann, binh)) {
            jdbc.update("update employee set search_text = ? where id = ?",
                    SearchText.of(jdbc.queryForObject("select full_name from employee where id = ?", String.class, id)), id);
        }
        ended = contract(ann, "LC-ENDED", "FIXED_TERM", today.minusDays(400), today.minusDays(35));
        open = contract(ann, "LC-OPEN", "INDEFINITE", today.minusDays(30), null);
        expiring = contract(binh, "LC-EXPIRING", "FIXED_TERM", today.minusDays(300), today.plusDays(30));
        upcoming = contract(binh, "LC-UPCOMING", "FIXED_TERM", today.plusDays(10), today.plusDays(375));
        running = contract(binh, "LC-RUNNING", "PROBATION", today.minusDays(10), today.plusDays(50));
    }

    @AfterEach
    void cleanUp() {
        overrides.forEach(id -> jdbc.update("delete from role_permission_override where id = ?", id));
        jdbc.update("delete from employment_contract where contract_number like 'LC-%'");
        employees.deleteAll();
        units.deleteAll(createdUnits);
    }

    @Test
    void listsContractsByEndDateThenEndedLastWithStatesAndNoSalary() throws Exception {
        MvcTestResult result = get(admin, "");
        assertThat(result).hasStatusOk().bodyJson().extractingPath("$.total").isEqualTo(5);
        assertThat(result).bodyJson().extractingPath("$.asOf").isEqualTo(today.toString());
        String json = result.getResponse().getContentAsString();
        assertThat(JsonPath.<List<String>>read(json, "$.items[*].contractNumber"))
                .containsExactly("LC-EXPIRING", "LC-RUNNING", "LC-UPCOMING", "LC-OPEN", "LC-ENDED");
        assertThat(JsonPath.<List<String>>read(json, "$.items[*].state"))
                .containsExactly("EXPIRING", "CURRENT", "UPCOMING", "CURRENT", "ENDED");
        assertThat(JsonPath.<Integer>read(json, "$.items[0].daysRemaining")).isEqualTo(30);
        assertThat(JsonPath.<Integer>read(json, "$.items[1].daysRemaining")).isEqualTo(50);
        assertThat(JsonPath.<Object>read(json, "$.items[2].daysRemaining")).isNull();
        assertThat(JsonPath.<Object>read(json, "$.items[3].daysRemaining")).isNull();
        assertThat(JsonPath.<String>read(json, "$.items[0].employeeId")).isEqualTo(binh.toString());
        assertThat(json).doesNotContain("baseSalary", "insuranceSalary", "allowances", "taxMethod", "12345678");
    }

    @Test
    void filtersByStateTypeAndSearchAndCombinesThem() {
        assertThat(get(admin, "?state=EXPIRING")).bodyJson().extractingPath("$.items[0].contractNumber").isEqualTo("LC-EXPIRING");
        assertThat(get(admin, "?state=UPCOMING")).bodyJson().extractingPath("$.total").isEqualTo(1);
        assertThat(get(admin, "?state=ENDED")).bodyJson().extractingPath("$.total").isEqualTo(1);
        assertThat(get(admin, "?state=CURRENT")).bodyJson().extractingPath("$.total").isEqualTo(2);
        assertThat(get(admin, "?type=probation")).bodyJson().extractingPath("$.items[0].contractNumber").isEqualTo("LC-RUNNING");
        assertThat(get(admin, "?type=FIXED_TERM&state=CURRENT")).bodyJson().extractingPath("$.total").isEqualTo(0);
        // Name search ignores accents and case; the contract number is searched too.
        assertThat(search("tran thi anh")).bodyJson().extractingPath("$.total").isEqualTo(2);
        assertThat(search("LC-UP")).bodyJson().extractingPath("$.items[0].contractNumber").isEqualTo("LC-UPCOMING");
        assertThat(search("binh", "state", "CURRENT")).bodyJson().extractingPath("$.items[0].contractNumber").isEqualTo("LC-RUNNING");
        assertThat(search("nobody-by-this-name")).bodyJson().extractingPath("$.total").isEqualTo(0);
        // LIKE wildcards in the term are literal.
        assertThat(search("%")).bodyJson().extractingPath("$.total").isEqualTo(0);
    }

    @Test
    void pagesStablyAndReportsTheTotalBeyondTheLastPage() throws Exception {
        String first = get(admin, "?size=2").getResponse().getContentAsString();
        assertThat(JsonPath.<List<String>>read(first, "$.items[*].contractNumber")).containsExactly("LC-EXPIRING", "LC-RUNNING");
        assertThat(get(admin, "?size=2")).bodyJson().extractingPath("$.total").isEqualTo(5);
        assertThat(JsonPath.<List<String>>read(get(admin, "?size=2&page=2").getResponse().getContentAsString(),
                "$.items[*].contractNumber")).containsExactly("LC-ENDED");
        assertThat(get(admin, "?size=2&page=9")).bodyJson().extractingPath("$.items.length()").isEqualTo(0);
    }

    @Test
    void rejectsAnonymousMissingPermissionsAndInvalidFilters() {
        assertThat(mvc.get().uri("/api/contracts").exchange()).hasStatus(401);
        for (Role role : List.of(Role.EMPLOYEE, Role.DIRECTOR, Role.LINE_MANAGER))
            assertThat(get(accounts.bearer(mvc, accounts.create(role)), "")).hasStatus(403);
        assertThat(get(accounts.bearer(mvc, accounts.create(Role.HR)), "")).hasStatusOk();
        for (String query : List.of("?state=SOON", "?page=-1", "?size=0", "?size=101", "?page=10001",
                "?search=" + "x".repeat(101), "?type=" + "x".repeat(51)))
            assertThat(get(admin, query)).hasStatus(400);
    }

    @Test
    void aScopedManagerSeesOnlyTheContractsOfTheirUnit() {
        OrgUnit unit = units.save(new OrgUnit(null, "LC" + UUID.randomUUID().toString().substring(0, 7).toUpperCase(Locale.ROOT),
                "Fictional Contract Unit", OrgUnitType.DEPARTMENT, null, 0, Instant.now()));
        createdUnits.add(unit);
        UUID head = employees.create("Fictional Contract Manager", unit.getId());
        employees.makeHead(unit.getId(), head);
        UUID member = employees.create("Fictional Contract Member", unit.getId());
        contract(member, "LC-MEMBER", "INDEFINITE", today.minusDays(5), null);
        var manager = accounts.create(Role.LINE_MANAGER);
        employees.link(manager.id(), head);
        grant("LINE_MANAGER", "EMPLOYEE_SENSITIVE_VIEW");
        MvcTestResult result = get(accounts.bearer(mvc, manager), "");
        assertThat(result).hasStatusOk().bodyJson().extractingPath("$.total").isEqualTo(1);
        assertThat(result).bodyJson().extractingPath("$.items[0].employeeId").isEqualTo(member.toString());
    }

    /** The term goes in as a parameter, so it is encoded once; extra is name/value pairs of further filters. */
    MvcTestResult search(String term, String... extra) {
        var request = mvc.get().uri("/api/contracts").header("Authorization", admin).param("search", term);
        for (int i = 0; i < extra.length; i += 2) request = request.param(extra[i], extra[i + 1]);
        return request.exchange();
    }

    MvcTestResult get(String bearer, String query) {
        return mvc.get().uri("/api/contracts" + query).header("Authorization", bearer).exchange();
    }

    UUID contract(UUID owner, String number, String type, LocalDate start, LocalDate end) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into employment_contract(id, legal_entity_id, employee_id, contract_number, contract_type,
                    signed_on, starts_on, ends_on, base_salary, insured, tax_method, created_at, updated_at)
                values (?, (select id from legal_entity), ?, ?, ?, ?, ?, ?, 12345678, false, 'WITHHOLD_10',
                    now(), now())
                """, id, owner, number, type, start, start, end);
        return id;
    }

    void grant(String role, String permission) {
        UUID id = UUID.randomUUID();
        overrides.add(id);
        jdbc.update("""
                insert into role_permission_override(id, legal_entity_id, role, permission, granted)
                values (?, (select id from legal_entity), ?, ?, true)
                """, id, role, permission);
    }
}
