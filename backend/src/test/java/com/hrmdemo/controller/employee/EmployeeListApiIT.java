package com.hrmdemo.controller.employee;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

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
 * Employee list and picker (HRM-06/BE-2) against real PostgreSQL. Every test starts from the same small company:
 * <pre>
 * Phòng Kỹ thuật (head: NV00001 Lê Minh Quân)
 *   ├─ Nhóm Web: NV00002 Trần Thị Mai (probation), NV00006 Hoàng Lan (inactive)
 *   └─ Lưu trữ (inactive unit): NV00005 Phạm Thu Hà
 * Phòng Kinh doanh: NV00003 Đỗ Văn Bình
 * directly under the company: NV00004 Nguyễn Văn An
 * </pre>
 */
@IntegrationTest
class EmployeeListApiIT {

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
    UUID engineer;
    UUID sales;
    OrgUnit engineering;
    OrgUnit web;
    OrgUnit archive;
    OrgUnit salesDepartment;
    UUID quan;
    UUID mai;
    UUID binh;
    UUID an;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        testEmployees.deleteAll();
        hr = testAccounts.bearer(mvc, testAccounts.create(Role.HR));
        engineer = testEmployees.position();
        sales = testEmployees.position();
        engineering = saveUnit(null, "Phòng Kỹ thuật");
        web = saveUnit(engineering.getId(), "Nhóm Web");
        archive = saveUnit(engineering.getId(), "Lưu trữ");
        salesDepartment = saveUnit(null, "Phòng Kinh doanh");

        quan = add("Lê Minh Quân", engineering.getId(), engineer, "2020-01-01", "OFFICIAL");
        testEmployees.makeHead(engineering.getId(), quan);
        mai = add("Trần Thị Mai", web.getId(), engineer, "2023-07-01", "PROBATION");
        binh = add("Đỗ Văn Bình", salesDepartment.getId(), sales, "2021-03-01", "OFFICIAL");
        an = add("Nguyễn Văn An", null, sales, "2019-05-01", "OFFICIAL");
        add("Phạm Thu Hà", archive.getId(), engineer, "2024-01-01", "OFFICIAL");
        UUID lan = add("Hoàng Lan", web.getId(), engineer, "2022-02-01", "OFFICIAL");
        jdbc.update("update employee set status = 'INACTIVE' where id = ?", lan);
        jdbc.update("update org_unit set active = false where id = ?", archive.getId());
    }

    @AfterEach
    void cleanUp() {
        testEmployees.deleteAll();
        orgUnits.deleteAllInBatch(savedUnits);
        jdbc.update("delete from role_permission_override");
    }

    // --- rows and order ---

    @Test
    void hrSeesEveryoneByCodeWithUnitParentPositionAndEffectiveManager() {
        MvcTestResult list = get(hr, "/api/employees");

        assertThat(list).hasStatusOk();
        assertThat(list).bodyJson().extractingPath("$.total").isEqualTo(6);
        assertThat(codes(list)).containsExactly("NV00001", "NV00002", "NV00003", "NV00004", "NV00005", "NV00006");
        assertThat(list).bodyJson().extractingPath("$.items[1].fullName").isEqualTo("Trần Thị Mai");
        assertThat(list).bodyJson().extractingPath("$.items[1].status").isEqualTo("PROBATION");
        assertThat(list).bodyJson().extractingPath("$.items[1].orgUnit.name").isEqualTo("Nhóm Web");
        assertThat(list).bodyJson().extractingPath("$.items[1].orgUnit.parentName").isEqualTo("Phòng Kỹ thuật");
        assertThat(list).bodyJson().extractingPath("$.items[1].position.id").isEqualTo(engineer.toString());
        assertThat(list).bodyJson().extractingPath("$.items[1].manager.id").isEqualTo(quan.toString());
        assertThat(list).bodyJson().extractingPath("$.items[1].hireDate").isEqualTo("2023-07-01");
        assertThat(list).bodyJson().extractingPath("$.items[4].orgUnit.active").isEqualTo(false);
        assertThat(list).bodyJson().extractingPath("$.items[4].manager.id").isEqualTo(quan.toString());
        assertThat(JsonPath.<Object>read(body(list), "$.items[0].manager")).as("the head of a top unit").isNull();
        assertThat(JsonPath.<Object>read(body(list), "$.items[0].orgUnit.parentName")).isNull();
        assertThat(JsonPath.<Object>read(body(list), "$.items[3].orgUnit")).isNull();
        assertThat(body(list)).doesNotContain("idNumber").doesNotContain("taxCode");
    }

    @Test
    void theListSortsByNameOrHireDateAndPages() {
        assertThat(codes(get(hr, "/api/employees?sort=fullName"))).containsExactly(
                "NV00003", "NV00006", "NV00001", "NV00004", "NV00005", "NV00002");
        assertThat(codes(get(hr, "/api/employees?sort=hireDate,desc"))).containsExactly(
                "NV00005", "NV00002", "NV00006", "NV00003", "NV00001", "NV00004");
        assertThat(codes(get(hr, "/api/employees?sort=code,desc"))).first().isEqualTo("NV00006");

        MvcTestResult second = get(hr, "/api/employees?page=1&size=2");
        assertThat(codes(second)).containsExactly("NV00003", "NV00004");
        assertThat(second).bodyJson().extractingPath("$.total").isEqualTo(6);

        assertInvalid(get(hr, "/api/employees?sort=salary"), "sort");
        assertInvalid(get(hr, "/api/employees?size=101"), "size");
        assertInvalid(get(hr, "/api/employees?status=LEFT"), "status");
    }

    // --- filters ---

    @Test
    void theFiltersNarrowTheList() {
        assertThat(codes(get(hr, "/api/employees?q=TRAN"))).containsExactly("NV00002");
        assertThat(codes(get(hr, "/api/employees?q=NV00003"))).containsExactly("NV00003");
        assertThat(codes(get(hr, "/api/employees?orgUnitId=" + engineering.getId())))
                .as("with the units below, the inactive one too")
                .containsExactly("NV00001", "NV00002", "NV00005", "NV00006");
        assertThat(codes(get(hr, "/api/employees?includeSubUnits=false&orgUnitId=" + engineering.getId())))
                .containsExactly("NV00001");
        assertThat(codes(get(hr, "/api/employees?orgUnitId=" + UUID.randomUUID()))).isEmpty();
        assertThat(codes(get(hr, "/api/employees?positionId=" + sales))).containsExactly("NV00003", "NV00004");
        assertThat(codes(get(hr, "/api/employees?status=PROBATION,OFFICIAL"))).doesNotContain("NV00006")
                .hasSize(5);
        assertThat(codes(get(hr, "/api/employees?status=INACTIVE"))).containsExactly("NV00006");
    }

    // --- data scope ---

    @Test
    void aLineManagerSeesThemselfAndTheUnitsBelowAndAFilterOutsideGivesAnEmptyPage() {
        String lineManager = linked(quan, Role.LINE_MANAGER, Role.EMPLOYEE);

        assertThat(codes(get(lineManager, "/api/employees")))
                .containsExactly("NV00001", "NV00002", "NV00005", "NV00006");
        MvcTestResult outside = get(lineManager, "/api/employees?orgUnitId=" + salesDepartment.getId());
        assertThat(outside).hasStatusOk();
        assertThat(outside).bodyJson().extractingPath("$.total").isEqualTo(0);
        assertThat(codes(get(lineManager, "/api/employees?q=nguyen"))).isEmpty();
    }

    @Test
    void theDirectorSeesEveryoneIncludingThoseDirectlyUnderTheCompany() {
        assertThat(codes(get(bearer(Role.DIRECTOR), "/api/employees?q=nguyen"))).containsExactly("NV00004");
    }

    @Test
    void aRoleWithSelfScopeSeesOnlyItsOwnEmployeeAndWithoutTheViewNothing() {
        String employee = linked(binh, Role.EMPLOYEE);
        assertThat(get(employee, "/api/employees")).hasStatus(403);

        grant("EMPLOYEE", "EMPLOYEE_VIEW");
        assertThat(codes(get(employee, "/api/employees"))).containsExactly("NV00003");
        // An Account with self scope but no Employee sees nobody.
        assertThat(get(bearer(Role.EMPLOYEE), "/api/employees")).bodyJson().extractingPath("$.total").isEqualTo(0);
        assertThat(mvc.get().uri("/api/employees")).hasStatus(401);
    }

    // --- the picker ---

    @Test
    void thePickerListsActiveEmployeesOfTheWholeCompanyByName() {
        String lineManager = linked(quan, Role.LINE_MANAGER);

        MvcTestResult options = get(lineManager, "/api/employees/options");
        assertThat(options).hasStatusOk();
        assertThat(options).bodyJson().extractingPath("$.total").isEqualTo(5);
        assertThat(codes(options)).containsExactly("NV00003", "NV00001", "NV00004", "NV00005", "NV00002");
        assertThat(options).bodyJson().extractingPath("$.items[0].orgUnitName").isEqualTo("Phòng Kinh doanh");
        assertThat(JsonPath.<Object>read(body(options), "$.items[2].orgUnitName")).isNull();
        assertThat(body(options)).doesNotContain("hireDate").doesNotContain("phone");

        assertThat(codes(get(hr, "/api/employees/options?status=INACTIVE"))).containsExactly("NV00006");
        assertThat(codes(get(hr, "/api/employees/options?q=van&excludeId=" + an))).containsExactly("NV00003");
        assertThat(codes(get(hr, "/api/employees/options?includeSubUnits=false&orgUnitId=" + web.getId())))
                .containsExactly("NV00002");
        assertInvalid(get(hr, "/api/employees/options?size=51"), "size");
    }

    @Test
    void thePickerNeedsTheEmployeeViewOrTheRightToEditUnitsOrAccounts() {
        assertThat(get(bearer(Role.EMPLOYEE), "/api/employees/options")).hasStatus(403);
        assertThat(get(bearer(Role.PROJECT_MANAGER), "/api/employees/options")).hasStatus(403);

        grant("PROJECT_MANAGER", "ORG_VIEW", "ORG_EDIT");
        assertThat(get(bearer(Role.PROJECT_MANAGER), "/api/employees/options")).bodyJson()
                .extractingPath("$.total").isEqualTo(5);
        grant("EMPLOYEE", "ACCOUNT_LIST", "ACCOUNT_EDIT");
        assertThat(get(bearer(Role.EMPLOYEE), "/api/employees/options")).hasStatusOk();
        // The picker is not the list.
        assertThat(get(bearer(Role.EMPLOYEE), "/api/employees")).hasStatus(403);
    }

    // --- helpers ---

    private UUID add(String fullName, UUID orgUnitId, UUID positionId, String hireDate, String status) {
        String idNumber = String.format("%012d",
                Math.abs(UUID.randomUUID().getMostSignificantBits() % 1_000_000_000_000L));
        MvcTestResult created = mvc.post().uri("/api/employees").header(HttpHeaders.AUTHORIZATION, hr)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"fullName":"%s","personal":{"dateOfBirth":"1990-01-01","gender":"MALE"},
                         "identity":{"idNumber":"%s"},
                         "job":{"orgUnitId":%s,"positionId":"%s","hireDate":"%s","status":"%s"}}"""
                        .formatted(fullName, idNumber, orgUnitId == null ? "null" : "\"" + orgUnitId + "\"",
                                positionId, hireDate, status))
                .exchange();
        assertThat(created).hasStatus(201);
        return UUID.fromString(JsonPath.read(body(created), "$.id"));
    }

    private OrgUnit saveUnit(UUID parentId, String name) {
        String code = "L" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        OrgUnit unit = orgUnits.save(new OrgUnit(parentId, code, name, OrgUnitType.DEPARTMENT, null, 0, Instant.now()));
        savedUnits.add(unit);
        return unit;
    }

    /** A new Account with the roles, linked to the Employee, signed in. */
    private String linked(UUID employeeId, Role... roles) {
        TestAccount account = testAccounts.create(roles);
        testEmployees.link(account.id(), employeeId);
        return testAccounts.bearer(mvc, account);
    }

    private String bearer(Role role) {
        return testAccounts.bearer(mvc, testAccounts.create(role));
    }

    /** Gives the role exactly these permissions (plus the base ones) through the role matrix. */
    private void grant(String role, String... permissions) {
        String list = String.join("\",\"", permissions);
        MvcTestResult saved = mvc.put().uri("/api/roles/permissions")
                .header(HttpHeaders.AUTHORIZATION, testAccounts.adminBearer(mvc))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roles\":[{\"role\":\"%s\",\"permissions\":[\"%s\"]}]}".formatted(role, list))
                .exchange();
        assertThat(saved).hasStatusOk();
    }

    private MvcTestResult get(String bearer, String uri) {
        return mvc.get().uri(uri).header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    private static List<String> codes(MvcTestResult result) {
        assertThat(result).hasStatusOk();
        return JsonPath.read(body(result), "$.items[*].code");
    }

    private static void assertInvalid(MvcTestResult result, String field) {
        assertThat(result).hasStatus(400);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("validation.invalid");
        assertThat(result).bodyJson().extractingPath("$.errors[0].field").isEqualTo(field);
    }

    private static String body(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }
}
