package com.hrmdemo.controller.employee;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import javax.sql.DataSource;

import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.entity.orgunit.OrgUnit;
import com.hrmdemo.entity.orgunit.OrgUnitType;
import com.hrmdemo.repository.orgunit.OrgUnitRepository;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import com.hrmdemo.support.TestAccounts.TestAccount;
import com.hrmdemo.support.TestEmployees;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * Editing an Employee (HRM-06/BE-3) against real PostgreSQL: the personal, identity and job parts, their
 * permissions and data scope, number conflicts, the manager cycle, the status rule and unchanged references.
 */
@IntegrationTest
class EmployeeEditApiIT {

    static final String CCCD = "079194005678";

    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    TestEmployees testEmployees;
    @Autowired
    OrgUnitRepository orgUnits;
    @Autowired
    DataSource dataSource;

    final List<OrgUnit> savedUnits = new ArrayList<>();
    JdbcTemplate jdbc;
    String hr;
    UUID position;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        testEmployees.deleteAll();
        hr = testAccounts.bearer(mvc, testAccounts.create(Role.HR));
        position = testEmployees.position();
    }

    @AfterEach
    void cleanUp() {
        testEmployees.deleteAll();
        // One statement, so a parent and its child units go together.
        orgUnits.deleteAllInBatch(savedUnits);
        jdbc.update("delete from role_permission_override");
    }

    // --- personal ---

    @Test
    void hrReplacesTheNameAndThePersonalFieldsAndTheCodeStays() {
        String id = create(null, null, CCCD);

        MvcTestResult edited = put(hr, id, "personal", """
                {"fullName":"  Trần  Thị Mai Anh ",
                 "personal":{"dateOfBirth":"1994-03-13","gender":"FEMALE","personalEmail":"Mai.Anh@Example.com",
                   "phone":"+84 912 345 678","address":null,
                   "emergencyContact":{"name":"Trần Văn Hùng","relationship":"Cha","phone":"0987.654.321"}}}""");

        assertThat(edited).hasStatusOk();
        assertThat(edited).bodyJson().extractingPath("$.code").isEqualTo("NV00001");
        assertThat(edited).bodyJson().extractingPath("$.fullName").isEqualTo("Trần Thị Mai Anh");
        assertThat(edited).bodyJson().extractingPath("$.personal.dateOfBirth").isEqualTo("1994-03-13");
        assertThat(edited).bodyJson().extractingPath("$.personal.personalEmail").isEqualTo("mai.anh@example.com");
        assertThat(edited).bodyJson().extractingPath("$.personal.phone").isEqualTo("0912345678");
        assertThat(edited).bodyJson().extractingPath("$.personal.emergencyContact.phone").isEqualTo("0987654321");
        assertThat(edited).bodyJson().extractingPath("$.identity.idNumber").isEqualTo(CCCD);
        // The new name is searchable.
        assertThat(get(hr, "/api/employees?q=anh")).bodyJson().extractingPath("$.total").isEqualTo(1);

        MvcTestResult invalid = put(hr, id, "personal", """
                {"fullName":" ","personal":{"dateOfBirth":"2015-01-01","gender":"OTHER"}}""");
        assertThat(invalid).hasStatus(400);
        assertThat(strings(invalid, "$.errors[*].field"))
                .containsExactlyInAnyOrder("fullName", "personal.dateOfBirth", "personal.gender");
        assertThat(strings(invalid, "$.errors[?(@.field == 'personal.dateOfBirth')].code"))
                .containsExactly("under_age");
    }

    // --- identity ---

    @Test
    void hrReplacesTheNumbersCheckedAgainstTheNewCccd() {
        String id = create(null, null, CCCD);
        String newCccd = "079194009999";

        // The MST still equals the old CCCD.
        MvcTestResult stale = put(hr, id, "identity", identity(newCccd, CCCD, null));
        assertThat(stale).hasStatus(400);
        assertThat(strings(stale, "$.errors[*].field")).containsExactly("taxCode");
        assertThat(strings(stale, "$.errors[*].code")).containsExactly("not_id_number");

        MvcTestResult edited = put(hr, id, "identity", """
                {"idNumber":"%s","idIssueDate":"2021-05-01","idIssuePlace":"Cục CS QLHC về TTXH",
                 "taxCode":"%s","socialInsuranceNumber":"7912341234"}""".formatted(newCccd, newCccd));
        assertThat(edited).hasStatusOk();
        assertThat(edited).bodyJson().extractingPath("$.identity.masked").isEqualTo(false);
        assertThat(edited).bodyJson().extractingPath("$.identity.idNumber").isEqualTo(newCccd);
        assertThat(edited).bodyJson().extractingPath("$.identity.taxCode").isEqualTo(newCccd);
        assertThat(edited).bodyJson().extractingPath("$.identity.idIssueDate").isEqualTo("2021-05-01");

        // Its own numbers sent again are no conflict; null clears a number.
        MvcTestResult cleared = put(hr, id, "identity", identity(newCccd, null, "7912341234"));
        assertThat(cleared).hasStatusOk();
        assertThat(JsonPath.<Object>read(body(cleared), "$.identity.taxCode")).isNull();
        assertThat(JsonPath.<Object>read(body(cleared), "$.identity.idIssueDate")).isNull();

        MvcTestResult missing = put(hr, id, "identity", identity(null, null, null));
        assertThat(strings(missing, "$.errors[*].field")).containsExactly("idNumber");
    }

    @Test
    void aNumberOfAnotherEmployeeIsAConflictAndConcurrentEditsCannotBothTakeIt() throws Exception {
        String first = create(null, null, CCCD);
        jdbc.update("update employee set tax_code = '0312345678', social_insurance_number = '7912341234' where id = ?",
                UUID.fromString(first));
        String second = create(null, null, "079194000002");

        MvcTestResult cccd = put(hr, second, "identity", identity(CCCD, null, null));
        assertCode(cccd, 409, "employee.id_number_taken");
        assertThat(cccd).bodyJson().extractingPath("$.employee.id").isEqualTo(first);
        assertCode(put(hr, second, "identity", identity("079194000002", "0312345678", null)), 409,
                "employee.tax_code_taken");
        assertCode(put(hr, second, "identity", identity("079194000002", null, "7912341234")), 409,
                "employee.social_insurance_number_taken");

        String third = create(null, null, "079194000003");
        List<MvcTestResult> same = concurrently(
                () -> put(hr, second, "identity", identity("079194000077", null, null)),
                () -> put(hr, third, "identity", identity("079194000077", null, null)));
        assertThat(same.stream().map(result -> result.getResponse().getStatus()).toList())
                .containsExactlyInAnyOrder(200, 409);
        assertThat(jdbc.queryForObject("select count(*) from employee where id_number = '079194000077'", Long.class))
                .isOne();
    }

    // --- job ---

    @Test
    void hrMovesAnEmployeeAndSwitchesTheStatusButNeverToInactive() {
        OrgUnit team = saveUnit(null);
        OrgUnit other = saveUnit(null);
        UUID head = testEmployees.create("Lê Minh Quân", other.getId());
        testEmployees.makeHead(other.getId(), head);
        String id = create(team.getId(), null, CCCD);

        MvcTestResult moved = put(hr, id, "job", job(other.getId(), position, null, "OFFICIAL"));
        assertThat(moved).hasStatusOk();
        assertThat(moved).bodyJson().extractingPath("$.status").isEqualTo("OFFICIAL");
        assertThat(moved).bodyJson().extractingPath("$.code").isEqualTo("NV00001");
        assertThat(moved).bodyJson().extractingPath("$.job.orgUnit.id").isEqualTo(other.getId().toString());
        assertThat(moved).bodyJson().extractingPath("$.job.managerSource").isEqualTo("UNIT_HEAD");
        assertThat(moved).bodyJson().extractingPath("$.job.manager.id").isEqualTo(head.toString());
        assertThat(moved).bodyJson().extractingPath("$.job.hireDate").isEqualTo("2026-11-01");

        MvcTestResult underTheCompany = put(hr, id, "job", job(null, position, null, "PROBATION"));
        assertThat(underTheCompany).hasStatusOk();
        assertThat(JsonPath.<Object>read(body(underTheCompany), "$.job.orgUnit")).isNull();
        assertThat(underTheCompany).bodyJson().extractingPath("$.status").isEqualTo("PROBATION");

        assertCode(put(hr, id, "job", job(null, position, null, "INACTIVE")), 409,
                "employee.status_change_not_allowed");
        MvcTestResult invalid = put(hr, id, "job", """
                {"orgUnitId":null,"positionId":null,"hireDate":"2008-01-01","status":null}""");
        assertThat(invalid).hasStatus(400);
        assertThat(strings(invalid, "$.errors[*].field")).containsExactlyInAnyOrder("positionId", "hireDate", "status");
        assertThat(strings(invalid, "$.errors[?(@.field == 'hireDate')].code")).containsExactly("under_age");

        jdbc.update("update employee set status = 'INACTIVE' where id = ?", UUID.fromString(id));
        assertCode(put(hr, id, "job", job(null, position, null, "OFFICIAL")), 409,
                "employee.status_change_not_allowed");
        // The other parts stay editable for someone who left.
        assertThat(put(hr, id, "personal", personal("Trần Thị Mai"))).hasStatusOk();
    }

    @Test
    void theManagerIsNotTheEmployeeItselfNorCloseACycle() {
        OrgUnit department = saveUnit(null);
        OrgUnit team = saveUnit(department.getId());
        String head = create(department.getId(), null, CCCD);
        testEmployees.makeHead(department.getId(), UUID.fromString(head));
        // Follows the head of the department.
        String member = create(team.getId(), null, "079194000002");
        // Chose the member.
        String report = create(null, UUID.fromString(member), "079194000003");

        assertManagerInvalid(put(hr, member, "job", job(team.getId(), position, UUID.fromString(member), "OFFICIAL")),
                "SELF");
        assertManagerInvalid(put(hr, member, "job", job(team.getId(), position, UUID.fromString(report), "OFFICIAL")),
                "CYCLE");
        // head -> member -> (default) head
        assertManagerInvalid(put(hr, head, "job",
                job(department.getId(), position, UUID.fromString(member), "OFFICIAL")), "CYCLE");
        assertCode(put(hr, member, "job", job(team.getId(), position, UUID.randomUUID(), "OFFICIAL")), 400,
                "employee.manager_not_found");

        MvcTestResult chosen = put(hr, report, "job", job(null, position, UUID.fromString(head), "OFFICIAL"));
        assertThat(chosen).hasStatusOk();
        assertThat(chosen).bodyJson().extractingPath("$.job.managerSource").isEqualTo("ASSIGNED");
        assertThat(chosen).bodyJson().extractingPath("$.job.manager.id").isEqualTo(head);
        // Back to the default.
        MvcTestResult following = put(hr, report, "job", job(team.getId(), position, null, "OFFICIAL"));
        assertThat(following).bodyJson().extractingPath("$.job.managerSource").isEqualTo("UNIT_HEAD");
        assertThat(following).bodyJson().extractingPath("$.job.manager.id").isEqualTo(head);
    }

    @Test
    void unchangedReferencesStayEvenWhenInactiveButNewOnesMustBeActive() {
        OrgUnit team = saveUnit(null);
        OrgUnit other = saveUnit(null);
        UUID manager = testEmployees.create("Lê Minh Quân", null);
        String id = create(team.getId(), manager, CCCD);
        UUID otherPosition = testEmployees.position();
        jdbc.update("update org_unit set active = false where id in (?, ?)", team.getId(), other.getId());
        jdbc.update("update catalog_item set active = false where id = ?", position);
        jdbc.update("update employee set status = 'INACTIVE' where id = ?", manager);

        MvcTestResult unchanged = put(hr, id, "job", job(team.getId(), position, manager, "OFFICIAL"));
        assertThat(unchanged).hasStatusOk();
        assertThat(unchanged).bodyJson().extractingPath("$.job.orgUnit.active").isEqualTo(false);
        assertThat(unchanged).bodyJson().extractingPath("$.job.position.active").isEqualTo(false);
        assertThat(unchanged).bodyJson().extractingPath("$.status").isEqualTo("OFFICIAL");

        assertCode(put(hr, id, "job", job(other.getId(), position, manager, "OFFICIAL")), 409,
                "employee.org_unit_inactive");
        assertCode(put(hr, id, "job", job(UUID.randomUUID(), position, manager, "OFFICIAL")), 400,
                "employee.org_unit_not_found");
        jdbc.update("update catalog_item set active = false where id = ?", otherPosition);
        assertCode(put(hr, id, "job", job(team.getId(), otherPosition, manager, "OFFICIAL")), 409,
                "employee.position_inactive");
        assertCode(put(hr, id, "job", job(team.getId(), UUID.randomUUID(), manager, "OFFICIAL")), 400,
                "employee.position_not_found");
        UUID left = testEmployees.create("Đỗ Văn Bình", null, "INACTIVE");
        assertCode(put(hr, id, "job", job(team.getId(), position, left, "OFFICIAL")), 400,
                "employee.manager_not_found");
    }

    // --- permissions and data scope ---

    @Test
    void anAccountantCannotEditAndHrWithoutTheSensitivePermissionCannotEditTheNumbers() {
        String id = create(null, null, CCCD);
        String accountant = bearer(Role.ACCOUNTANT);

        assertCode(put(accountant, id, "personal", personal("Trần Thị Mai")), 403, "auth.forbidden");
        assertCode(put(accountant, id, "identity", identity(CCCD, null, null)), 403, "auth.forbidden");
        assertCode(put(accountant, id, "job", job(null, position, null, "OFFICIAL")), 403, "auth.forbidden");
        assertCode(put(hr, UUID.randomUUID().toString(), "personal", personal("Trần Thị Mai")), 404,
                "employee.not_found");
        assertThat(mvc.put().uri("/api/employees/" + id + "/personal").contentType(MediaType.APPLICATION_JSON)
                .content(personal("Trần Thị Mai"))).hasStatus(401);

        setPermissions("HR", "ORG_VIEW", "ORG_EDIT", "EMPLOYEE_VIEW", "EMPLOYEE_EDIT");
        assertCode(put(hr, id, "identity", identity(CCCD, null, null)), 403, "auth.forbidden");
        MvcTestResult personal = put(hr, id, "personal", personal("Trần Thị Mai Anh"));
        assertThat(personal).hasStatusOk();
        assertThat(personal).bodyJson().extractingPath("$.identity.masked").isEqualTo(true);
        assertThat(personal).bodyJson().extractingPath("$.identity.idNumber").isEqualTo("••••••••5678");
        assertThat(body(personal)).doesNotContain(CCCD);
    }

    @Test
    void aLineManagerGrantedEditEditsWithinTheirUnitsAndMovesPeopleOnlyIntoThem() {
        OrgUnit department = saveUnit(null);
        OrgUnit team = saveUnit(department.getId());
        OrgUnit elsewhere = saveUnit(null);
        UUID head = testEmployees.create("Lê Minh Quân", department.getId());
        testEmployees.makeHead(department.getId(), head);
        String member = create(team.getId(), null, CCCD);
        String stranger = create(elsewhere.getId(), null, "079194000002");
        setPermissions("LINE_MANAGER", "EMPLOYEE_VIEW", "EMPLOYEE_EDIT");
        TestAccount account = testAccounts.create(Role.LINE_MANAGER, Role.EMPLOYEE);
        testEmployees.link(account.id(), head);
        String lineManager = testAccounts.bearer(mvc, account);

        MvcTestResult edited = put(lineManager, member, "job", job(department.getId(), position, null, "OFFICIAL"));
        assertThat(edited).hasStatusOk();
        assertThat(edited).bodyJson().extractingPath("$.identity.masked").isEqualTo(true);
        assertCode(put(lineManager, member, "job", job(elsewhere.getId(), position, null, "OFFICIAL")), 403,
                "auth.forbidden");
        assertCode(put(lineManager, member, "job", job(null, position, null, "OFFICIAL")), 403, "auth.forbidden");
        assertCode(put(lineManager, stranger, "personal", personal("Đỗ Văn Bình")), 403, "auth.forbidden");
        assertCode(put(lineManager, member, "identity", identity(CCCD, null, null)), 403, "auth.forbidden");
    }

    // --- helpers ---

    /** An Employee added through the API, on probation, hired 2026-11-01. */
    private String create(UUID orgUnitId, UUID managerId, String idNumber) {
        MvcTestResult created = mvc.post().uri("/api/employees").header(HttpHeaders.AUTHORIZATION, hr)
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"fullName":"Trần Thị Mai","personal":{"dateOfBirth":"1994-03-12","gender":"FEMALE"},
                         "identity":{"idNumber":"%s","taxCode":"%s"},
                         "job":{"orgUnitId":%s,"positionId":"%s","managerId":%s,"hireDate":"2026-11-01"}}"""
                        .formatted(idNumber, idNumber, quoted(orgUnitId), position, quoted(managerId)))
                .exchange();
        assertThat(created).hasStatus(201);
        return JsonPath.read(body(created), "$.id");
    }

    /** A unit with a code no other test uses; removed again after the test. */
    private OrgUnit saveUnit(UUID parentId) {
        String code = "E" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        OrgUnit unit = orgUnits.save(
                new OrgUnit(parentId, code, "Unit " + code, OrgUnitType.DEPARTMENT, null, 0, Instant.now()));
        savedUnits.add(0, unit);
        return unit;
    }

    private void setPermissions(String role, String... permissions) {
        String list = String.join("\",\"", permissions);
        MvcTestResult saved = mvc.put().uri("/api/roles/permissions")
                .header(HttpHeaders.AUTHORIZATION, testAccounts.adminBearer(mvc))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roles\":[{\"role\":\"%s\",\"permissions\":[\"%s\"]}]}".formatted(role, list))
                .exchange();
        assertThat(saved).hasStatusOk();
    }

    private static String personal(String fullName) {
        return """
                {"fullName":"%s","personal":{"dateOfBirth":"1994-03-12","gender":"FEMALE"}}""".formatted(fullName);
    }

    private static String identity(String idNumber, String taxCode, String socialInsuranceNumber) {
        return """
                {"idNumber":%s,"taxCode":%s,"socialInsuranceNumber":%s}"""
                .formatted(quoted(idNumber), quoted(taxCode), quoted(socialInsuranceNumber));
    }

    private static String job(UUID orgUnitId, UUID positionId, UUID managerId, String status) {
        return """
                {"orgUnitId":%s,"positionId":%s,"managerId":%s,"hireDate":"2026-11-01","status":%s}"""
                .formatted(quoted(orgUnitId), quoted(positionId), quoted(managerId), quoted(status));
    }

    private static String quoted(Object value) {
        return value == null ? "null" : "\"" + value + "\"";
    }

    private String bearer(Role role) {
        return testAccounts.bearer(mvc, testAccounts.create(role));
    }

    private MvcTestResult put(String bearer, String id, String part, String json) {
        return mvc.put().uri("/api/employees/" + id + "/" + part).header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    private MvcTestResult get(String bearer, String uri) {
        return mvc.get().uri(uri).header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    @SafeVarargs
    private static List<MvcTestResult> concurrently(Callable<MvcTestResult>... calls) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(calls.length);
        try {
            CountDownLatch start = new CountDownLatch(1);
            List<Future<MvcTestResult>> futures = new ArrayList<>();
            for (Callable<MvcTestResult> call : calls) {
                futures.add(pool.submit(() -> {
                    start.await();
                    return call.call();
                }));
            }
            start.countDown();
            List<MvcTestResult> results = new ArrayList<>();
            for (Future<MvcTestResult> future : futures) {
                results.add(future.get(30, TimeUnit.SECONDS));
            }
            return results;
        } finally {
            pool.shutdownNow();
        }
    }

    private static void assertManagerInvalid(MvcTestResult result, String reason) {
        assertCode(result, 400, "employee.manager_invalid");
        assertThat(result).bodyJson().extractingPath("$.reason").isEqualTo(reason);
    }

    private static void assertCode(MvcTestResult result, int status, String code) {
        assertThat(result).hasStatus(status);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo(code);
    }

    private static List<String> strings(MvcTestResult result, String path) {
        return JsonPath.read(body(result), path);
    }

    private static String body(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }
}
