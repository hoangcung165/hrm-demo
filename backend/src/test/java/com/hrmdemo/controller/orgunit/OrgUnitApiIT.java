package com.hrmdemo.controller.orgunit;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.UnsupportedEncodingException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import javax.sql.DataSource;

import com.hrmdemo.config.CurrentLegalEntity;
import com.hrmdemo.dto.orgunit.OrgUnitResponse;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.entity.orgunit.OrgUnit;
import com.hrmdemo.repository.orgunit.OrgUnitRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.orgunit.OrgUnitService;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Org structure API against real PostgreSQL. All tests share the single Legal entity, so each test starts
 * from an empty org tree.
 */
@IntegrationTest
class OrgUnitApiIT {

    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    DataSource dataSource;
    @Autowired
    PlatformTransactionManager transactionManager;
    @Autowired
    CurrentLegalEntity currentLegalEntity;
    @Autowired
    OrgUnitRepository orgUnits;
    @Autowired
    OrgUnitService orgUnitService;

    JdbcTemplate jdbc;
    String hr;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        // One statement removes parents and children together.
        jdbc.update("delete from org_unit");
        hr = testAccounts.bearer(mvc, testAccounts.create(Role.HR));
    }

    @Test
    void aThreeLevelTreeIsBuiltAndReadBackWithTheCompanyOnTop() {
        String admin = testAccounts.adminBearer(mvc);
        assertThat(mvc.put().uri("/api/company").header(HttpHeaders.AUTHORIZATION, admin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"name":"Acme Software JSC","legalRepresentativeName":"Nguyen Van A",
                         "legalRepresentativeTitle":"Director"}""")).hasStatusOk();

        MvcTestResult created = post(admin, "/api/org-units", """
                {"name":"  Da Nang branch ","code":"dn","type":"BRANCH","parentId":null,"headEmployeeId":null}""");
        assertThat(created).hasStatus(201);
        assertThat(created).bodyJson().extractingPath("$.name").isEqualTo("Da Nang branch");
        assertThat(created).bodyJson().extractingPath("$.code").isEqualTo("DN");
        assertThat(created).bodyJson().extractingPath("$.type").isEqualTo("BRANCH");
        assertThat(created).bodyJson().extractingPath("$.parentId").isNull();
        assertThat(created).bodyJson().extractingPath("$.active").isEqualTo(true);
        assertThat(created).bodyJson().extractingPath("$.head").isNull();
        String branch = id(created);
        String engineering = create(hr, "Engineering", "ENG", "DEPARTMENT", branch);
        String qa = create(hr, "QA team", "QA", "TEAM", engineering);
        String platform = create(hr, "Platform team", "PLAT", "TEAM", engineering);
        String sales = create(hr, "Sales", "SALES", "DEPARTMENT", null);
        assertThat(post(hr, "/api/org-units/" + sales + "/deactivate", null)).hasStatusOk();

        MvcTestResult tree = get(hr);

        assertThat(tree).hasStatusOk();
        assertThat(tree).bodyJson().extractingPath("$.root.name").isEqualTo("Acme Software JSC");
        assertThat(tree).bodyJson().extractingPath("$.root.type").isEqualTo("COMPANY");
        assertThat(tree).bodyJson().extractingPath("$.root.head.fullName").isEqualTo("Nguyen Van A");
        assertThat(tree).bodyJson().extractingPath("$.root.head.position").isEqualTo("Director");
        assertThat(tree).bodyJson().extractingPath("$.root.head.employeeId").isNull();
        assertThat(tree).bodyJson().extractingPath("$.root.childCount").isEqualTo(2);
        assertThat(tree).bodyJson().extractingPath("$.root.headcountTotal").isEqualTo(0);
        assertThat(tree).bodyJson().extractingPath("$.summary.activeUnitCount").isEqualTo(4);
        assertThat(tree).bodyJson().extractingPath("$.summary.employeeCount").isEqualTo(0);
        // Parents come before their children; siblings in the order they were added.
        assertThat(tree).bodyJson().extractingPath("$.units[*].code").asArray()
                .containsExactly("DN", "ENG", "QA", "PLAT", "SALES");

        Map<String, Map<String, Object>> units = unitsByCode(tree);
        assertThat(units.get("DN")).containsEntry("id", branch).containsEntry("parentId", null)
                .containsEntry("childCount", 1).containsEntry("active", true);
        assertThat(units.get("ENG")).containsEntry("id", engineering).containsEntry("parentId", branch)
                .containsEntry("childCount", 2).containsEntry("type", "DEPARTMENT");
        assertThat(units.get("QA")).containsEntry("id", qa).containsEntry("parentId", engineering)
                .containsEntry("childCount", 0).containsEntry("head", null)
                .containsEntry("headcountDirect", 0).containsEntry("headcountTotal", 0);
        assertThat(units.get("PLAT")).containsEntry("id", platform).containsEntry("parentId", engineering);
        assertThat(units.get("SALES")).containsEntry("parentId", null).containsEntry("active", false);
    }

    @Test
    void aUnitMovesToAnotherParentWithEverythingBelowIt() {
        String engineering = create(hr, "Engineering", "ENG", "DEPARTMENT", null);
        String operations = create(hr, "Operations", "OPS", "DEPARTMENT", null);
        String platform = create(hr, "Platform team", "PLAT", "TEAM", engineering);
        String sre = create(hr, "SRE", "SRE", "TEAM", platform);

        MvcTestResult moved = post(hr, "/api/org-units/" + platform + "/move", """
                {"parentId":"%s"}""".formatted(operations));

        assertThat(moved).hasStatusOk();
        assertThat(moved).bodyJson().extractingPath("$.parentId").isEqualTo(operations);
        assertThat(moved).bodyJson().extractingPath("$.childCount").isEqualTo(1);
        MvcTestResult tree = get(hr);
        assertThat(tree).bodyJson().extractingPath("$.units[*].code").asArray()
                .containsExactly("ENG", "OPS", "PLAT", "SRE");
        Map<String, Map<String, Object>> units = unitsByCode(tree);
        assertThat(units.get("ENG")).containsEntry("childCount", 0);
        assertThat(units.get("OPS")).containsEntry("childCount", 1);
        assertThat(units.get("PLAT")).containsEntry("parentId", operations);
        assertThat(units.get("SRE")).containsEntry("parentId", platform).containsEntry("id", sre);

        // And up to the company.
        MvcTestResult toCompany = post(hr, "/api/org-units/" + platform + "/move", """
                {"parentId":null}""");
        assertThat(toCompany).hasStatusOk();
        assertThat(toCompany).bodyJson().extractingPath("$.parentId").isNull();
        assertThat(get(hr)).bodyJson().extractingPath("$.root.childCount").isEqualTo(3);
    }

    @Test
    void aUnitCannotBeMovedIntoItselfABranchBelowItOrAnInactiveUnit() {
        String engineering = create(hr, "Engineering", "ENG", "DEPARTMENT", null);
        String platform = create(hr, "Platform team", "PLAT", "TEAM", engineering);
        String closed = create(hr, "Closed department", "OLD", "DEPARTMENT", null);
        assertThat(post(hr, "/api/org-units/" + closed + "/deactivate", null)).hasStatusOk();

        for (String target : new String[] {engineering, platform}) {
            MvcTestResult moved = post(hr, "/api/org-units/" + engineering + "/move", """
                    {"parentId":"%s"}""".formatted(target));
            assertThat(moved).hasStatus(409);
            assertThat(moved).bodyJson().extractingPath("$.code").isEqualTo("org_unit.move_into_self_or_descendant");
        }
        MvcTestResult intoInactive = post(hr, "/api/org-units/" + engineering + "/move", """
                {"parentId":"%s"}""".formatted(closed));
        assertThat(intoInactive).hasStatus(409);
        assertThat(intoInactive).bodyJson().extractingPath("$.code").isEqualTo("org_unit.parent_inactive");
        MvcTestResult childOfInactive = post(hr, "/api/org-units", """
                {"name":"New team","code":"NEW","type":"TEAM","parentId":"%s"}""".formatted(closed));
        assertThat(childOfInactive).hasStatus(409);
        assertThat(childOfInactive).bodyJson().extractingPath("$.code").isEqualTo("org_unit.parent_inactive");
        MvcTestResult intoNowhere = post(hr, "/api/org-units/" + engineering + "/move", """
                {"parentId":"%s"}""".formatted(UUID.randomUUID()));
        assertThat(intoNowhere).hasStatus(400);
        assertThat(intoNowhere).bodyJson().extractingPath("$.code").isEqualTo("org_unit.parent_not_found");

        assertThat(unitsByCode(get(hr)).get("ENG")).containsEntry("parentId", null);
    }

    @Test
    void aUnitWithChildUnitsCannotBeDeletedButALeafCan() {
        String engineering = create(hr, "Engineering", "ENG", "DEPARTMENT", null);
        String platform = create(hr, "Platform team", "PLAT", "TEAM", engineering);

        MvcTestResult blocked = delete(hr, engineering);

        assertThat(blocked).hasStatus(409);
        assertThat(blocked).bodyJson().extractingPath("$.code").isEqualTo("org_unit.not_empty");
        assertThat(blocked).bodyJson().extractingPath("$.childCount").isEqualTo(1);
        assertThat(blocked).bodyJson().extractingPath("$.employeeCount").isEqualTo(0);

        assertThat(delete(hr, platform)).hasStatus(204);
        assertThat(get(hr)).bodyJson().extractingPath("$.units[*].code").asArray().containsExactly("ENG");
        // Now the parent is empty too.
        assertThat(delete(hr, engineering)).hasStatus(204);
        assertThat(get(hr)).bodyJson().extractingPath("$.units").asArray().isEmpty();

        MvcTestResult gone = delete(hr, engineering);
        assertThat(gone).hasStatus(404);
        assertThat(gone).bodyJson().extractingPath("$.code").isEqualTo("org_unit.not_found");
    }

    @Test
    void deactivatingAUnitLeavesItsChildUnitsActiveAndItCanBeReactivated() {
        String engineering = create(hr, "Engineering", "ENG", "DEPARTMENT", null);
        create(hr, "Platform team", "PLAT", "TEAM", engineering);

        MvcTestResult deactivated = post(hr, "/api/org-units/" + engineering + "/deactivate", null);

        assertThat(deactivated).hasStatusOk();
        assertThat(deactivated).bodyJson().extractingPath("$.active").isEqualTo(false);
        Map<String, Map<String, Object>> units = unitsByCode(get(hr));
        assertThat(units.get("ENG")).containsEntry("active", false);
        assertThat(units.get("PLAT")).containsEntry("active", true);

        MvcTestResult reactivated = post(hr, "/api/org-units/" + engineering + "/reactivate", null);
        assertThat(reactivated).hasStatusOk();
        assertThat(reactivated).bodyJson().extractingPath("$.active").isEqualTo(true);
    }

    @Test
    void aDuplicateCodeIsRejectedWithTheUnitThatHoldsIt() {
        String testing = create(hr, "Testing team", "QA", "TEAM", null);
        String engineering = create(hr, "Engineering", "ENG", "DEPARTMENT", null);

        MvcTestResult duplicate = post(hr, "/api/org-units", """
                {"name":"Quality","code":"qa","type":"TEAM"}""");

        assertThat(duplicate).hasStatus(409);
        assertThat(duplicate).bodyJson().extractingPath("$.code").isEqualTo("org_unit.code_taken");
        assertThat(duplicate).bodyJson().extractingPath("$.holder.id").isEqualTo(testing);
        assertThat(duplicate).bodyJson().extractingPath("$.holder.code").isEqualTo("QA");
        assertThat(duplicate).bodyJson().extractingPath("$.holder.name").isEqualTo("Testing team");

        MvcTestResult renamed = put(hr, engineering, """
                {"name":"Engineering","code":"Qa","type":"DEPARTMENT"}""");
        assertThat(renamed).hasStatus(409);
        assertThat(renamed).bodyJson().extractingPath("$.holder.id").isEqualTo(testing);
    }

    @Test
    void editingChangesNameCodeAndTypeAndKeepsTheParent() {
        String engineering = create(hr, "Engineering", "ENG", "DEPARTMENT", null);
        String team = create(hr, "QA team", "QA", "TEAM", engineering);

        MvcTestResult updated = put(hr, team, """
                {"name":"Quality","code":"qc-1","type":"DEPARTMENT","headEmployeeId":null}""");

        assertThat(updated).hasStatusOk();
        assertThat(updated).bodyJson().extractingPath("$.name").isEqualTo("Quality");
        assertThat(updated).bodyJson().extractingPath("$.code").isEqualTo("QC-1");
        assertThat(updated).bodyJson().extractingPath("$.type").isEqualTo("DEPARTMENT");
        assertThat(updated).bodyJson().extractingPath("$.parentId").isEqualTo(engineering);
        assertThat(unitsByCode(get(hr)).get("QC-1")).containsEntry("name", "Quality");
    }

    @Test
    void aHeadCannotBeAssignedUntilEmployeesExist() {
        MvcTestResult created = post(hr, "/api/org-units", """
                {"name":"Engineering","code":"ENG","type":"DEPARTMENT","headEmployeeId":"%s"}"""
                .formatted(UUID.randomUUID()));

        assertThat(created).hasStatus(400);
        assertThat(created).bodyJson().extractingPath("$.code").isEqualTo("org_unit.head_not_found");
    }

    @Test
    void invalidInputIsRejectedWithFieldErrors() {
        MvcTestResult created = post(hr, "/api/org-units", """
                {"name":" ","code":"A","type":"COMPANY"}""");

        assertThat(created).hasStatus(400);
        assertThat(created).bodyJson().extractingPath("$.code").isEqualTo("validation.invalid");
        assertThat(created).bodyJson().extractingPath("$.errors[*].field").asArray()
                .containsExactlyInAnyOrder("name", "code", "type");

        MvcTestResult tooLong = post(hr, "/api/org-units", """
                {"name":"%s","code":"TOO-LONG-CODE","type":"TEAM"}""".formatted("x".repeat(151)));
        assertThat(tooLong).hasStatus(400);
        assertThat(tooLong).bodyJson().extractingPath("$.errors[*].field").asArray()
                .containsExactlyInAnyOrder("name", "code");

        MvcTestResult malformedId = post(hr, "/api/org-units", """
                {"name":"Engineering","code":"ENG","type":"TEAM","parentId":"not-an-id"}""");
        assertThat(malformedId).hasStatus(400);
        assertThat(malformedId).bodyJson().extractingPath("$.code").isEqualTo("validation.invalid");

        assertThat(get(hr)).bodyJson().extractingPath("$.units").asArray().isEmpty();
    }

    @Test
    void theDirectorReadsTheOrgStructureButCannotChangeIt() {
        String unit = create(hr, "Engineering", "ENG", "DEPARTMENT", null);
        String director = testAccounts.bearer(mvc, testAccounts.create(Role.DIRECTOR));

        MvcTestResult tree = get(director);
        assertThat(tree).hasStatusOk();
        assertThat(tree).bodyJson().extractingPath("$.units[*].code").asArray().containsExactly("ENG");

        for (MvcTestResult result : new MvcTestResult[] {
                post(director, "/api/org-units", """
                        {"name":"Sales","code":"SALES","type":"DEPARTMENT"}"""),
                put(director, unit, """
                        {"name":"Renamed","code":"ENG","type":"DEPARTMENT"}"""),
                post(director, "/api/org-units/" + unit + "/move", """
                        {"parentId":null}"""),
                post(director, "/api/org-units/" + unit + "/deactivate", null),
                post(director, "/api/org-units/" + unit + "/reactivate", null),
                delete(director, unit)}) {
            assertThat(result).hasStatus(403);
            assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("auth.forbidden");
        }
        assertThat(unitsByCode(get(hr)).get("ENG")).containsEntry("name", "Engineering").containsEntry("active", true);
    }

    @Test
    void anEmployeeCannotReadTheOrgStructure() {
        MvcTestResult tree = get(testAccounts.bearer(mvc, testAccounts.create(Role.EMPLOYEE)));

        assertThat(tree).hasStatus(403);
        assertThat(tree).bodyJson().extractingPath("$.code").isEqualTo("auth.forbidden");
    }

    @Test
    void theOrgStructureNeedsSignIn() {
        MvcTestResult tree = mvc.get().uri("/api/org-units").exchange();

        assertThat(tree).hasStatus(401);
        assertThat(tree).bodyJson().extractingPath("$.code").isEqualTo("auth.unauthenticated");
    }

    @Test
    void theOrgPermissionsShowUpInMe() {
        MvcTestResult me = mvc.get().uri("/api/me").header(HttpHeaders.AUTHORIZATION, hr).exchange();

        assertThat(me).bodyJson().extractingPath("$.permissions").asArray().contains("ORG_VIEW", "ORG_EDIT");
    }

    @Test
    void aUnitOfAnotherLegalEntityIsInvisible() {
        String mine = create(hr, "Engineering", "ENG", "DEPARTMENT", null);
        CurrentAccount admin = new CurrentAccount(UUID.randomUUID(), Set.of("ADMIN"));
        // A second Legal entity can only exist without the single-row index. DDL is transactional in PostgreSQL,
        // so everything here is rolled back (same approach as LegalEntityIT).
        var transaction = new TransactionTemplate(transactionManager);
        transaction.executeWithoutResult(status -> {
            status.setRollbackOnly();
            UUID otherLegalEntity = UUID.randomUUID();
            UUID foreignUnit = UUID.randomUUID();
            jdbc.execute("drop index uq_legal_entity_single");
            jdbc.update("insert into legal_entity (id, name, created_at, updated_at) "
                    + "values (?, 'Another', now(), now())", otherLegalEntity);
            // The same code as a unit of this company: codes are unique per Legal entity.
            jdbc.update("""
                    insert into org_unit (id, legal_entity_id, code, name, type, created_at, updated_at)
                    values (?, ?, 'ENG', 'Foreign engineering', 'DEPARTMENT', now(), now())""",
                    foreignUnit, otherLegalEntity);

            assertThat(jdbc.queryForObject("select count(*) from org_unit where id = ?", Long.class, foreignUnit))
                    .as("the row is really there").isEqualTo(1);
            assertThat(orgUnits.findById(foreignUnit)).as("load by id").isEmpty();
            assertThat(orgUnits.findAll()).as("find all").extracting(OrgUnit::getId)
                    .containsExactly(UUID.fromString(mine));
            assertThat(orgUnitService.structure(admin).units()).as("the tree")
                    .extracting(OrgUnitResponse::name).containsExactly("Engineering");
        });

        assertThat(jdbc.queryForObject("select legal_entity_id from org_unit where id = ?", UUID.class,
                UUID.fromString(mine))).isEqualTo(currentLegalEntity.id());
    }

    @Test
    void theDatabaseRefusesADuplicateCodeAndAParentThatIsTheUnitItself() {
        String unit = create(hr, "Engineering", "ENG", "DEPARTMENT", null);

        assertThat(isRefused("""
                insert into org_unit (id, legal_entity_id, code, name, type, created_at, updated_at)
                select gen_random_uuid(), legal_entity_id, code, 'Copy', type, now(), now() from org_unit"""))
                .as("duplicate code").isTrue();
        assertThat(isRefused("update org_unit set parent_id = id where id = '" + unit + "'"))
                .as("own parent").isTrue();
        assertThat(isRefused("update org_unit set code = 'eng' where id = '" + unit + "'"))
                .as("lower-case code").isTrue();
    }

    @Test
    void theOpenApiDocumentDescribesTheOrgStructureEndpoints() {
        MvcTestResult docs = mvc.get().uri("/v3/api-docs").header(HttpHeaders.AUTHORIZATION, hr).exchange();

        assertThat(docs).hasStatusOk();
        assertThat(docs).bodyJson().extractingPath("$.paths['/api/org-units'].get").isNotNull();
        assertThat(docs).bodyJson().extractingPath("$.paths['/api/org-units'].post").isNotNull();
        assertThat(docs).bodyJson().extractingPath("$.paths['/api/org-units/{id}'].put").isNotNull();
        assertThat(docs).bodyJson().extractingPath("$.paths['/api/org-units/{id}'].delete").isNotNull();
        assertThat(docs).bodyJson().extractingPath("$.paths['/api/org-units/{id}/move'].post").isNotNull();
        assertThat(docs).bodyJson().extractingPath("$.paths['/api/org-units/{id}/deactivate'].post").isNotNull();
        assertThat(docs).bodyJson().extractingPath("$.paths['/api/org-units/{id}/reactivate'].post").isNotNull();
    }

    private boolean isRefused(String sql) {
        try {
            jdbc.update(sql);
            return false;
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            return true;
        }
    }

    /** Creates a unit through the API and returns its id. */
    private String create(String bearer, String name, String code, String type, String parentId) {
        MvcTestResult created = post(bearer, "/api/org-units", """
                {"name":"%s","code":"%s","type":"%s","parentId":%s}"""
                .formatted(name, code, type, parentId == null ? "null" : "\"" + parentId + "\""));
        assertThat(created).hasStatus(201);
        return id(created);
    }

    private MvcTestResult get(String bearer) {
        return mvc.get().uri("/api/org-units").header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    private MvcTestResult post(String bearer, String path, String json) {
        var request = mvc.post().uri(path).header(HttpHeaders.AUTHORIZATION, bearer);
        if (json != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).content(json);
        }
        return request.exchange();
    }

    private MvcTestResult put(String bearer, String id, String json) {
        return mvc.put().uri("/api/org-units/" + id)
                .header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json)
                .exchange();
    }

    private MvcTestResult delete(String bearer, String id) {
        return mvc.delete().uri("/api/org-units/" + id).header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    private static String id(MvcTestResult result) {
        return JsonPath.read(body(result), "$.id");
    }

    private static Map<String, Map<String, Object>> unitsByCode(MvcTestResult tree) {
        List<Map<String, Object>> units = JsonPath.read(body(tree), "$.units");
        Map<String, Map<String, Object>> byCode = new LinkedHashMap<>();
        for (Map<String, Object> unit : units) {
            byCode.put((String) unit.get("code"), unit);
        }
        return byCode;
    }

    private static String body(MvcTestResult result) {
        try {
            return result.getResponse().getContentAsString();
        } catch (UnsupportedEncodingException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
