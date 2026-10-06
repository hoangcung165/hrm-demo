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
 * Employees API (HRM-06/BE-1) against real PostgreSQL: create with the issued code, the profile with masking,
 * the data scope, and the form helpers. Every test starts without Employees and with the code counter at 0.
 */
@IntegrationTest
class EmployeeApiIT {

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

    // --- create ---

    @Test
    void hrAddsAnEmployeeWithTheNextCodeOnProbationAndReadsItBack() {
        OrgUnit team = saveUnit(null);
        assertThat(get(hr, "/api/employees/next-code")).bodyJson().extractingPath("$.code").isEqualTo("NV00001");

        MvcTestResult created = create(hr, """
                {"fullName":"  Trần   Thị Mai ",
                 "personal":{"dateOfBirth":"1994-03-12","gender":"FEMALE","personalEmail":"Mai.Tran@Example.com",
                   "phone":"0912 345 678","address":"12 Lê Lợi",
                   "emergencyContact":{"name":"Trần Văn Hùng","relationship":"Cha","phone":"+84987654321"}},
                 "identity":{"idNumber":"%s","idIssueDate":"2021-05-01","idIssuePlace":"Cục CS QLHC về TTXH",
                   "taxCode":"%s","socialInsuranceNumber":"7912341234"},
                 "job":{"orgUnitId":"%s","positionId":"%s","managerId":null,"hireDate":"2026-11-01"}}"""
                .formatted(CCCD, CCCD, team.getId(), position));

        assertThat(created).hasStatus(201);
        assertThat(created).bodyJson().extractingPath("$.code").isEqualTo("NV00001");
        assertThat(created).bodyJson().extractingPath("$.fullName").isEqualTo("Trần Thị Mai");
        assertThat(created).bodyJson().extractingPath("$.status").isEqualTo("PROBATION");
        assertThat(created).bodyJson().extractingPath("$.personal.personalEmail").isEqualTo("mai.tran@example.com");
        assertThat(created).bodyJson().extractingPath("$.personal.phone").isEqualTo("0912345678");
        assertThat(created).bodyJson().extractingPath("$.personal.emergencyContact.phone").isEqualTo("0987654321");
        assertThat(created).bodyJson().extractingPath("$.identity.masked").isEqualTo(false);
        assertThat(created).bodyJson().extractingPath("$.identity.idNumber").isEqualTo(CCCD);
        assertThat(created).bodyJson().extractingPath("$.identity.idIssueDate").isEqualTo("2021-05-01");
        assertThat(created).bodyJson().extractingPath("$.job.orgUnit.id").isEqualTo(team.getId().toString());
        assertThat(created).bodyJson().extractingPath("$.job.orgUnit.active").isEqualTo(true);
        assertThat(created).bodyJson().extractingPath("$.job.position.id").isEqualTo(position.toString());
        assertThat(created).bodyJson().extractingPath("$.job.managerSource").isEqualTo("UNIT_HEAD");
        assertThat(JsonPath.<Object>read(body(created), "$.job.manager")).isNull();

        MvcTestResult read = get(hr, "/api/employees/" + id(created));
        assertThat(read).hasStatusOk();
        assertThat(read).bodyJson().extractingPath("$.code").isEqualTo("NV00001");
        assertThat(read).bodyJson().extractingPath("$.job.hireDate").isEqualTo("2026-11-01");
        assertThat(get(hr, "/api/employees/next-code")).bodyJson().extractingPath("$.code").isEqualTo("NV00002");
        assertThat(id(create(hr, minimal("079194000002", null, null)))).isNotNull();
        assertThat(jdbc.queryForList("select code from employee order by code", String.class))
                .containsExactly("NV00001", "NV00002");
    }

    @Test
    void anEmployeeMaySitDirectlyUnderTheCompanyAndStartOfficial() {
        MvcTestResult created = create(hr, """
                {"fullName":"Nguyễn Văn An","personal":{"dateOfBirth":"1980-01-01","gender":"MALE"},
                 "identity":{"idNumber":"%s"},
                 "job":{"orgUnitId":null,"positionId":"%s","hireDate":"2020-01-01","status":"OFFICIAL"}}"""
                .formatted(CCCD, position));

        assertThat(created).hasStatus(201);
        assertThat(created).bodyJson().extractingPath("$.status").isEqualTo("OFFICIAL");
        assertThat(JsonPath.<Object>read(body(created), "$.job.orgUnit")).isNull();
        assertThat(JsonPath.<Object>read(body(created), "$.identity.taxCode")).isNull();
        assertThat(JsonPath.<Object>read(body(created), "$.personal.emergencyContact")).isNull();
    }

    @Test
    void twoCreatesAtTheSameTimeGetDifferentCodesAndOnlyOneMayTakeACccd() throws Exception {
        List<MvcTestResult> distinct = concurrently(
                () -> create(hr, minimal("079194000011", null, null)),
                () -> create(hr, minimal("079194000012", null, null)));
        assertThat(distinct).allSatisfy(result -> assertThat(result).hasStatus(201));
        assertThat(distinct.stream().map(EmployeeApiIT::code).toList())
                .containsExactlyInAnyOrder("NV00001", "NV00002");

        List<MvcTestResult> same = concurrently(
                () -> create(hr, minimal("079194000013", null, null)),
                () -> create(hr, minimal("079194000013", null, null)));
        assertThat(same.stream().map(result -> result.getResponse().getStatus()).toList())
                .containsExactlyInAnyOrder(201, 409);
        // The refused create rolled back: no code was used up.
        assertThat(get(hr, "/api/employees/next-code")).bodyJson().extractingPath("$.code").isEqualTo("NV00004");
    }

    @Test
    void theCccdIsRequiredAndEveryFailingFieldIsNamed() {
        MvcTestResult invalid = create(hr, """
                {"fullName":" ","personal":{"dateOfBirth":"2015-01-01","gender":"OTHER"},
                 "identity":{"idNumber":null,"taxCode":"079194005679"},
                 "job":{"positionId":"%s","hireDate":"2026-11-01","status":"INACTIVE"}}""".formatted(position));

        assertThat(invalid).hasStatus(400);
        assertThat(invalid).bodyJson().extractingPath("$.code").isEqualTo("validation.invalid");
        assertThat(strings(invalid, "$.errors[*].field")).containsExactlyInAnyOrder("fullName",
                "personal.dateOfBirth", "personal.gender", "identity.idNumber", "job.status");
        assertThat(strings(invalid, "$.errors[?(@.field == 'identity.idNumber')].code")).containsExactly("required");
        assertThat(strings(invalid, "$.errors[?(@.field == 'personal.dateOfBirth')].code"))
                .containsExactly("under_age");

        MvcTestResult notTheCccd = create(hr, minimal(CCCD, "079194005679", null));
        assertThat(notTheCccd).hasStatus(400);
        assertThat(strings(notTheCccd, "$.errors[*].code")).containsExactly("not_id_number");
        assertThat(jdbc.queryForObject("select count(*) from employee", Long.class)).isZero();
    }

    @Test
    void eachIdentityNumberIsUniqueInTheCompany() {
        String first = id(create(hr, minimal(CCCD, "0312345678", "7912341234")));

        MvcTestResult cccd = create(hr, minimal(CCCD, null, null));
        assertThat(cccd).hasStatus(409);
        assertThat(cccd).bodyJson().extractingPath("$.code").isEqualTo("employee.id_number_taken");
        assertThat(cccd).bodyJson().extractingPath("$.employee.id").isEqualTo(first);
        assertThat(cccd).bodyJson().extractingPath("$.employee.code").isEqualTo("NV00001");

        assertThat(create(hr, minimal("079194000099", "0312345678", null))).bodyJson()
                .extractingPath("$.code").isEqualTo("employee.tax_code_taken");
        assertThat(create(hr, minimal("079194000099", null, "7912341234"))).bodyJson()
                .extractingPath("$.code").isEqualTo("employee.social_insurance_number_taken");
    }

    @Test
    void newReferencesMustExistAndBeActive() {
        OrgUnit inactive = saveUnit(null);
        jdbc.update("update org_unit set active = false where id = ?", inactive.getId());
        UUID inactivePosition = testEmployees.position(false);

        assertCode(create(hr, withJob(UUID.randomUUID(), position, null)), 400, "employee.org_unit_not_found");
        assertCode(create(hr, withJob(inactive.getId(), position, null)), 409, "employee.org_unit_inactive");
        assertCode(create(hr, withJob(null, UUID.randomUUID(), null)), 400, "employee.position_not_found");
        assertCode(create(hr, withJob(null, inactivePosition, null)), 409, "employee.position_inactive");
        assertCode(create(hr, withJob(null, position, UUID.randomUUID())), 400, "employee.manager_not_found");
        UUID left = testEmployees.create("Đỗ Văn Bình", null, "INACTIVE");
        assertCode(create(hr, withJob(null, position, left)), 400, "employee.manager_not_found");
    }

    // --- the manager ---

    @Test
    void theManagerFollowsTheUnitHeadLiveUnlessOneWasChosen() {
        OrgUnit department = saveUnit(null);
        OrgUnit team = saveUnit(department.getId());
        UUID head = testEmployees.create("Lê Minh Quân", department.getId());
        testEmployees.makeHead(department.getId(), head);
        UUID chosen = testEmployees.create("Phạm Thu Hà", null);

        String following = id(create(hr, withJob(team.getId(), position, null)));
        String assigned = id(create(hr, withJob(team.getId(), position, chosen)));

        MvcTestResult read = get(hr, "/api/employees/" + following);
        assertThat(read).bodyJson().extractingPath("$.job.managerSource").isEqualTo("UNIT_HEAD");
        assertThat(read).bodyJson().extractingPath("$.job.manager.id").isEqualTo(head.toString());
        assertThat(read).bodyJson().extractingPath("$.job.manager.fullName").isEqualTo("Lê Minh Quân");
        MvcTestResult other = get(hr, "/api/employees/" + assigned);
        assertThat(other).bodyJson().extractingPath("$.job.managerSource").isEqualTo("ASSIGNED");
        assertThat(other).bodyJson().extractingPath("$.job.manager.id").isEqualTo(chosen.toString());

        // The head of a top-level unit has no default manager.
        MvcTestResult ofTheHead = get(hr, "/api/employees/" + head);
        assertThat(ofTheHead).bodyJson().extractingPath("$.job.managerSource").isEqualTo("UNIT_HEAD");
        assertThat(JsonPath.<Object>read(body(ofTheHead), "$.job.manager")).isNull();

        // A new head changes the default at once, also for the former head.
        testEmployees.makeHead(department.getId(), chosen);
        assertThat(get(hr, "/api/employees/" + following)).bodyJson()
                .extractingPath("$.job.manager.id").isEqualTo(chosen.toString());
        assertThat(get(hr, "/api/employees/" + head)).bodyJson()
                .extractingPath("$.job.manager.id").isEqualTo(chosen.toString());
    }

    @Test
    void theDefaultManagerPreviewWalksUpPastTheEmployeeItself() {
        OrgUnit department = saveUnit(null);
        OrgUnit team = saveUnit(department.getId());
        UUID head = testEmployees.create("Lê Minh Quân", department.getId());
        testEmployees.makeHead(department.getId(), head);

        MvcTestResult member = get(hr, "/api/employees/default-manager?orgUnitId=" + team.getId());
        assertThat(member).hasStatusOk();
        assertThat(member).bodyJson().extractingPath("$.manager.id").isEqualTo(head.toString());
        assertThat(member).bodyJson().extractingPath("$.manager.fullName").isEqualTo("Lê Minh Quân");

        MvcTestResult ofTheHead = get(hr,
                "/api/employees/default-manager?orgUnitId=" + department.getId() + "&employeeId=" + head);
        assertThat(JsonPath.<Object>read(body(ofTheHead), "$.manager")).isNull();
        assertThat(JsonPath.<Object>read(body(get(hr, "/api/employees/default-manager")), "$.manager")).isNull();
        assertCode(get(hr, "/api/employees/default-manager?orgUnitId=" + UUID.randomUUID()), 400,
                "employee.org_unit_not_found");
    }

    // --- masking ---

    @Test
    void theNumbersAreMaskedForACallerWithoutTheSensitivePermission() {
        String id = id(create(hr, minimal(CCCD, "0312345678", null)));

        MvcTestResult director = get(bearer(Role.DIRECTOR), "/api/employees/" + id);
        assertThat(director).hasStatusOk();
        assertThat(director).bodyJson().extractingPath("$.identity.masked").isEqualTo(true);
        assertThat(director).bodyJson().extractingPath("$.identity.idNumber").isEqualTo("••••••••5678");
        assertThat(director).bodyJson().extractingPath("$.identity.taxCode").isEqualTo("••••••5678");
        assertThat(JsonPath.<Object>read(body(director), "$.identity.socialInsuranceNumber")).isNull();
        assertThat(body(director)).doesNotContain(CCCD).doesNotContain("0312345678");

        MvcTestResult accountant = get(bearer(Role.ACCOUNTANT), "/api/employees/" + id);
        assertThat(accountant).bodyJson().extractingPath("$.identity.masked").isEqualTo(false);
        assertThat(accountant).bodyJson().extractingPath("$.identity.idNumber").isEqualTo(CCCD);
    }

    @Test
    void aCallerWhoMayAddButNotSeeTheNumbersEntersThemAndGetsThemBackMasked() {
        String admin = testAccounts.adminBearer(mvc);
        MvcTestResult granted = mvc.put().uri("/api/roles/permissions").header(HttpHeaders.AUTHORIZATION, admin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"roles":[{"role":"DIRECTOR","permissions":["ORG_VIEW","EMPLOYEE_VIEW","EMPLOYEE_EDIT"]}]}""")
                .exchange();
        assertThat(granted).hasStatusOk();

        MvcTestResult created = create(bearer(Role.DIRECTOR), minimal(CCCD, null, null));

        assertThat(created).hasStatus(201);
        assertThat(created).bodyJson().extractingPath("$.identity.masked").isEqualTo(true);
        assertThat(created).bodyJson().extractingPath("$.identity.idNumber").isEqualTo("••••••••5678");
        assertThat(jdbc.queryForObject("select id_number from employee", String.class)).isEqualTo(CCCD);
    }

    @Test
    void anEmployeeReadsTheirOwnProfileUnmaskedButNoOneElses() {
        String own = id(create(hr, minimal(CCCD, null, null)));
        String colleague = id(create(hr, minimal("079194000002", null, null)));
        TestAccount account = testAccounts.create(Role.EMPLOYEE);
        testEmployees.link(account.id(), UUID.fromString(own));
        String employee = testAccounts.bearer(mvc, account);

        MvcTestResult mine = get(employee, "/api/employees/" + own);
        assertThat(mine).hasStatusOk();
        assertThat(mine).bodyJson().extractingPath("$.identity.masked").isEqualTo(false);
        assertThat(mine).bodyJson().extractingPath("$.identity.idNumber").isEqualTo(CCCD);

        assertCode(get(employee, "/api/employees/" + colleague), 403, "auth.forbidden");
    }

    // --- data scope and permissions ---

    @Test
    void aLineManagerReadsTheEmployeesOfTheUnitsTheyHeadAndBelowOnly() {
        OrgUnit department = saveUnit(null);
        OrgUnit team = saveUnit(department.getId());
        OrgUnit elsewhere = saveUnit(null);
        UUID head = testEmployees.create("Lê Minh Quân", department.getId());
        testEmployees.makeHead(department.getId(), head);
        UUID member = testEmployees.create("Trần Thị Mai", team.getId());
        UUID stranger = testEmployees.create("Đỗ Văn Bình", elsewhere.getId());
        UUID underTheCompany = testEmployees.create("Nguyễn Văn An", null);
        TestAccount account = testAccounts.create(Role.LINE_MANAGER, Role.EMPLOYEE);
        testEmployees.link(account.id(), head);
        String lineManager = testAccounts.bearer(mvc, account);

        MvcTestResult read = get(lineManager, "/api/employees/" + member);
        assertThat(read).hasStatusOk();
        assertThat(read).bodyJson().extractingPath("$.identity.masked").isEqualTo(true);
        assertCode(get(lineManager, "/api/employees/" + stranger), 403, "auth.forbidden");
        assertCode(get(lineManager, "/api/employees/" + underTheCompany), 403, "auth.forbidden");
        assertThat(get(hr, "/api/employees/" + underTheCompany)).hasStatusOk();
    }

    @Test
    void addingAndTheFormHelpersNeedTheEditPermission() {
        String employee = bearer(Role.EMPLOYEE);
        String director = bearer(Role.DIRECTOR);

        assertCode(create(employee, minimal(CCCD, null, null)), 403, "auth.forbidden");
        assertCode(create(director, minimal(CCCD, null, null)), 403, "auth.forbidden");
        assertCode(get(director, "/api/employees/next-code"), 403, "auth.forbidden");
        assertCode(get(director, "/api/employees/default-manager"), 403, "auth.forbidden");
        assertThat(jdbc.queryForObject("select count(*) from employee", Long.class)).isZero();

        String someone = id(create(hr, minimal(CCCD, null, null)));
        assertCode(get(employee, "/api/employees/" + someone), 403, "auth.forbidden");
        assertCode(get(hr, "/api/employees/" + UUID.randomUUID()), 404, "employee.not_found");

        assertThat(mvc.get().uri("/api/employees/" + someone)).hasStatus(401);
        assertThat(mvc.post().uri("/api/employees").contentType(MediaType.APPLICATION_JSON)
                .content(minimal("079194000002", null, null))).hasStatus(401);
    }

    // --- helpers ---

    /** A unit with a code no other test uses; removed again after the test. */
    private OrgUnit saveUnit(UUID parentId) {
        String code = "E" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        OrgUnit unit = orgUnits.save(
                new OrgUnit(parentId, code, "Unit " + code, OrgUnitType.DEPARTMENT, null, 0, Instant.now()));
        savedUnits.add(0, unit);
        return unit;
    }

    private String minimal(String idNumber, String taxCode, String socialInsuranceNumber) {
        return """
                {"fullName":"Trần Thị Mai","personal":{"dateOfBirth":"1994-03-12","gender":"FEMALE"},
                 "identity":{"idNumber":%s,"taxCode":%s,"socialInsuranceNumber":%s},
                 "job":{"positionId":"%s","hireDate":"2026-11-01"}}"""
                .formatted(quoted(idNumber), quoted(taxCode), quoted(socialInsuranceNumber), position);
    }

    private String withJob(UUID orgUnitId, UUID positionId, UUID managerId) {
        return """
                {"fullName":"Trần Thị Mai","personal":{"dateOfBirth":"1994-03-12","gender":"FEMALE"},
                 "identity":{"idNumber":"%s"},
                 "job":{"orgUnitId":%s,"positionId":"%s","managerId":%s,"hireDate":"2026-11-01"}}"""
                .formatted(randomIdNumber(), quoted(orgUnitId), positionId, quoted(managerId));
    }

    private static String randomIdNumber() {
        return String.format("%012d", Math.abs(UUID.randomUUID().getMostSignificantBits() % 1_000_000_000_000L));
    }

    private static String quoted(Object value) {
        return value == null ? "null" : "\"" + value + "\"";
    }

    private String bearer(Role role) {
        return testAccounts.bearer(mvc, testAccounts.create(role));
    }

    private MvcTestResult create(String bearer, String json) {
        return mvc.post().uri("/api/employees").header(HttpHeaders.AUTHORIZATION, bearer)
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

    private static void assertCode(MvcTestResult result, int status, String code) {
        assertThat(result).hasStatus(status);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo(code);
    }

    private static String id(MvcTestResult result) {
        assertThat(result).hasStatus(201);
        return JsonPath.read(body(result), "$.id");
    }

    private static String code(MvcTestResult result) {
        return JsonPath.read(body(result), "$.code");
    }

    private static List<String> strings(MvcTestResult result, String path) {
        return JsonPath.read(body(result), path);
    }

    private static String body(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }
}
