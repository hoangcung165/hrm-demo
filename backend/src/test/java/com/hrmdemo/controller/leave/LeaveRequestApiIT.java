package com.hrmdemo.controller.leave;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import javax.sql.DataSource;

import com.hrmdemo.entity.auth.Role;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * Đơn nghỉ against real PostgreSQL: Nguyễn Văn An (Nhóm Web, hired two years ago on 1 January, so 12 days of Phép năm
 * a year) asks for leave; Lê Văn Hùng, head of the unit, is his Quản lý trực tiếp and the default Luồng phê duyệt
 * "Nghỉ phép" sends every request to him. Dates are relative to today, on working days that are no holiday.
 */
@IntegrationTest
class LeaveRequestApiIT {

    static final ZoneId COMPANY = ZoneId.of("Asia/Ho_Chi_Minh");
    static final byte[] PDF = "%PDF-1.4\n% medical certificate\n".getBytes(StandardCharsets.US_ASCII);

    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    TestEmployees testEmployees;
    @Autowired
    DataSource dataSource;

    JdbcTemplate jdbc;
    LocalDate today;
    UUID an;
    UUID hung;
    UUID tri;
    String anBearer;
    String hungBearer;
    String triBearer;
    String hrBearer;
    String annual;
    String sick;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        testEmployees.deleteAll();
        jdbc.update("delete from approval_flow_setting");
        jdbc.update("delete from work_schedule");
        jdbc.update("delete from org_unit");
        UUID web = UUID.randomUUID();
        jdbc.update("""
                insert into org_unit (id, legal_entity_id, parent_id, code, name, type, created_at, updated_at)
                values (?, (select id from legal_entity), null, 'WEB', 'Nhóm Web', 'TEAM', now(), now())""", web);
        today = LocalDate.now(COMPANY);
        hung = testEmployees.create("Lê Văn Hùng", web);
        an = testEmployees.create("Nguyễn Văn An", web);
        tri = testEmployees.create("Cao Minh Trí", web);
        UUID mai = testEmployees.create("Trần Thị Mai", null);
        testEmployees.makeHead(web, hung);
        jdbc.update("update employee set hire_date = ? where id = ?", LocalDate.of(today.getYear() - 2, 1, 1), an);
        anBearer = signedIn(an, Role.EMPLOYEE);
        hungBearer = signedIn(hung, Role.LINE_MANAGER);
        triBearer = signedIn(tri, Role.EMPLOYEE);
        hrBearer = signedIn(mai, Role.HR);
        annual = typeId("PN");
        sick = typeId("OM");
    }

    @AfterEach
    void cleanUp() {
        testEmployees.deleteAll();
        jdbc.update("delete from work_schedule");
        jdbc.update("delete from org_unit");
        jdbc.update("delete from leave_policy where effective_from = date '2099-01-01'");
        jdbc.update("""
                delete from leave_policy where leave_type_id in (select id from leave_type where code like 'ZT%')""");
        jdbc.update("delete from leave_type where code like 'ZT%'");
    }

    // ------------------------------------------------------------------------------------------- the main journey

    @Test
    void aHalfDayRequestThatIsApprovedTakesHalfADayFromTheBalance() {
        LocalDate day = workingDay(7, DayOfWeek.WEDNESDAY);
        String json = request(annual, day, "MORNING", day, "MORNING", "Đi khám răng");

        MvcTestResult check = post(anBearer, "/api/leave-requests/check", json);
        assertThat(check).hasStatusOk();
        assertThat(number(check, "$.total")).isEqualByComparingTo("0.5");
        assertThat(strings(check, "$.problems[*].code")).isEmpty();
        assertThat(strings(check, "$.approvers.firstLevel[*].fullName")).containsExactly("Lê Văn Hùng");
        assertThat(check).bodyJson().extractingPath("$.approvers.autoApproveDays").isEqualTo(3);
        BigDecimal accrued = number(balance(anBearer, day.getYear(), "PN"), "accrued");

        MvcTestResult sent = post(anBearer, "/api/leave-requests", json);
        assertThat(sent).hasStatus(201);
        String id = JsonPath.read(body(sent), "$.id");
        assertThat(sent).bodyJson().extractingPath("$.status").isEqualTo("PENDING");
        assertThat(sent).bodyJson().extractingPath("$.dayList[0].morning").isEqualTo(true);
        assertThat(sent).bodyJson().extractingPath("$.dayList[0].afternoon").isEqualTo(false);
        assertThat(sent).bodyJson().extractingPath("$.canCancel").isEqualTo(true);
        assertThat(number(balance(anBearer, day.getYear(), "PN"), "pending")).isEqualByComparingTo("0.5");
        assertThat(number(balance(anBearer, day.getYear(), "PN"), "remaining"))
                .isEqualByComparingTo(accrued.subtract(new BigDecimal("0.5")));

        // The approver sees the request in the shared approval API, with a Vietnamese summary.
        MvcTestResult approval = mvc.get().uri("/api/approvals/{id}", id).header(HttpHeaders.AUTHORIZATION, hungBearer)
                .exchange();
        assertThat(approval).bodyJson().extractingPath("$.type").isEqualTo("LEAVE");
        assertThat(approval).bodyJson().extractingPath("$.summary").asString().startsWith("Phép năm, 0,5 ngày (")
                .endsWith(", buổi sáng)");
        MvcTestResult forHung = get(hungBearer, id);
        assertThat(number(forHung, "$.remainingBefore")).isEqualByComparingTo(accrued);
        assertThat(number(forHung, "$.remainingAfter")).isEqualByComparingTo(accrued.subtract(new BigDecimal("0.5")));

        assertThat(decide(hungBearer, id, "approve", null)).hasStatusOk();

        assertThat(get(anBearer, id)).bodyJson().extractingPath("$.status").isEqualTo("APPROVED");
        String balance = balance(anBearer, day.getYear(), "PN");
        assertThat(number(balance, "used")).isEqualByComparingTo("0.5");
        assertThat(number(balance, "pending")).isEqualByComparingTo("0");
        assertThat(number(balance, "remaining")).isEqualByComparingTo(accrued.subtract(new BigDecimal("0.5")));
    }

    @Test
    void aRequestOverTheBalanceIsRefusedWithWhatIsLeft() {
        // About fifty working days: whatever the year boundary does, one year gets more than its 12 days.
        LocalDate start = workingDay(7, DayOfWeek.MONDAY);
        String json = request(annual, start, "FULL", start.plusDays(70), "FULL", null);

        MvcTestResult check = post(anBearer, "/api/leave-requests/check", json);
        assertThat(strings(check, "$.problems[*].code")).contains("leave.over_balance");

        MvcTestResult sent = post(anBearer, "/api/leave-requests", json);
        assertCode(sent, 400, "leave.over_balance");
        assertThat(strings(sent, "$.problems[*].code")).contains("leave.over_balance");
        assertThat(jdbc.queryForObject("select count(*) from leave_request", Long.class)).isZero();
    }

    @Test
    void aRequestAcrossAWeekendCountsOnlyTheWorkingDaysAndASecondOneOnTheSameDaysOverlaps() {
        LocalDate friday = workingDay(7, DayOfWeek.FRIDAY);
        while (holiday(friday.plusDays(1)) || holiday(friday.plusDays(2)) || holiday(friday.plusDays(3))) {
            friday = workingDay((int) ChronoUnit.DAYS.between(today, friday) + 1,
                    DayOfWeek.FRIDAY);
        }
        LocalDate monday = friday.plusDays(3);
        String json = request(annual, friday, "FULL", monday, "FULL", null);

        MvcTestResult sent = post(anBearer, "/api/leave-requests", json);

        assertThat(sent).hasStatus(201);
        assertThat(number(sent, "$.days")).isEqualByComparingTo("2");
        assertThat(strings(sent, "$.dayList[*].kind")).containsExactly("WORKING", "DAY_OFF", "DAY_OFF", "WORKING");
        assertCode(post(anBearer, "/api/leave-requests", request(annual, monday, "AFTERNOON", monday, "AFTERNOON",
                null)), 400, "leave.overlap");
    }

    @Test
    void cancellingAnApprovedRequestBeforeItStartsGivesTheDaysBack() {
        LocalDate day = workingDay(7, DayOfWeek.TUESDAY);
        String id = submit(request(annual, day, "FULL", day, "FULL", null));
        assertThat(decide(hungBearer, id, "approve", null)).hasStatusOk();
        assertThat(number(balance(anBearer, day.getYear(), "PN"), "used")).isEqualByComparingTo("1");

        MvcTestResult cancelled = post(anBearer, "/api/leave-requests/" + id + "/cancel", "{}");

        assertThat(cancelled).hasStatusOk();
        assertThat(cancelled).bodyJson().extractingPath("$.status").isEqualTo("CANCELLED");
        assertThat(cancelled).bodyJson().extractingPath("$.canCancel").isEqualTo(false);
        assertThat(number(balance(anBearer, day.getYear(), "PN"), "used")).isEqualByComparingTo("0");
        assertCode(post(anBearer, "/api/leave-requests/" + id + "/cancel", "{}"), 409, "leave.already_closed");
    }

    @Test
    void aWaitingRequestIsCancelledWithItsApprovalRequestAndOnlyByItsSender() {
        LocalDate day = workingDay(7, DayOfWeek.THURSDAY);
        String id = submit(request(annual, day, "FULL", day, "FULL", null));

        assertCode(post(hungBearer, "/api/leave-requests/" + id + "/cancel", "{}"), 403, "approval.not_sender");
        assertCode(post(triBearer, "/api/leave-requests/" + id + "/cancel", "{}"), 404, "approval.not_found");
        MvcTestResult cancelled = post(anBearer, "/api/leave-requests/" + id + "/cancel", "{}");

        assertThat(cancelled).bodyJson().extractingPath("$.status").isEqualTo("CANCELLED");
        assertThat(cancelled).bodyJson().extractingPath("$.approval.status").isEqualTo("CANCELLED");
        assertThat(number(balance(anBearer, day.getYear(), "PN"), "pending")).isEqualByComparingTo("0");
    }

    @Test
    void aReturnedRequestIsChangedAndSentAgain() {
        LocalDate day = workingDay(7, DayOfWeek.WEDNESDAY);
        String id = submit(request(annual, day, "FULL", day, "FULL", null));
        assertThat(decide(hungBearer, id, "return", "Ngày đó có họp dự án")).hasStatusOk();
        assertThat(get(anBearer, id)).bodyJson().extractingPath("$.canEdit").isEqualTo(true);
        LocalDate later = workingDay(14, DayOfWeek.WEDNESDAY);

        MvcTestResult resent = mvc.put().uri("/api/leave-requests/{id}", id)
                .header(HttpHeaders.AUTHORIZATION, anBearer).contentType(MediaType.APPLICATION_JSON)
                .content(request(annual, later, "AFTERNOON", later, "AFTERNOON", "Đổi sang buổi chiều")).exchange();

        assertThat(resent).hasStatusOk();
        assertThat(resent).bodyJson().extractingPath("$.status").isEqualTo("PENDING");
        assertThat(resent).bodyJson().extractingPath("$.startDate").isEqualTo(later.toString());
        assertThat(number(resent, "$.days")).isEqualByComparingTo("0.5");
        assertThat(number(balance(anBearer, later.getYear(), "PN"), "pending")).isEqualByComparingTo("0.5");
        assertCode(mvc.put().uri("/api/leave-requests/{id}", id).header(HttpHeaders.AUTHORIZATION, anBearer)
                .contentType(MediaType.APPLICATION_JSON)
                .content(request(annual, later, "FULL", later, "FULL", null)).exchange(), 409, "leave.not_returned");
    }

    // ------------------------------------------------------------------------------------ files and people copied

    @Test
    void sickLeaveNeedsAFileThatTheApproverCanDownload() {
        LocalDate day = workingDay(7, DayOfWeek.MONDAY);
        assertCode(post(anBearer, "/api/leave-requests", request(sick, day, "FULL", day, "FULL", null)), 400,
                "leave.attachment_required");

        MvcTestResult uploaded = mvc.perform(multipart("/api/leave-attachments")
                .file(new MockMultipartFile("file", "giay-kham.pdf", "application/pdf", PDF))
                .header(HttpHeaders.AUTHORIZATION, anBearer));
        assertThat(uploaded).hasStatus(201);
        String file = JsonPath.read(body(uploaded), "$.id");
        String json = request(sick, day, "FULL", day, "FULL", null).replace("\"attachmentIds\":[]",
                "\"attachmentIds\":[\"" + file + "\"]");

        String id = submit(json);

        assertThat(strings(get(hungBearer, id), "$.attachments[*].fileName")).containsExactly("giay-kham.pdf");
        MvcTestResult download = mvc.get().uri("/api/leave-requests/{id}/attachments/{file}", id, file)
                .header(HttpHeaders.AUTHORIZATION, hungBearer).exchange();
        assertThat(download).hasStatusOk();
        assertThat(download.getResponse().getContentAsByteArray()).isEqualTo(PDF);
        assertThat(mvc.get().uri("/api/leave-requests/{id}/attachments/{file}", id, file)
                .header(HttpHeaders.AUTHORIZATION, triBearer).exchange()).hasStatus(404);
        // Sick leave is not limited: it has used and pending, no remaining.
        String sickBalance = balance(anBearer, day.getYear(), "OM");
        assertThat(JsonPath.<Object>read(sickBalance, "$.remaining")).isNull();
        assertThat(number(sickBalance, "pending")).isEqualByComparingTo("1");
    }

    @Test
    void aPersonCopiedReadsTheRequestButNotTheApprovalOrTheBalance() {
        LocalDate day = workingDay(7, DayOfWeek.TUESDAY);
        String json = request(annual, day, "FULL", day, "FULL", null).replace("\"cc\":[]", "\"cc\":[\"" + tri + "\"]");
        String id = submit(json);

        MvcTestResult forTri = get(triBearer, id);

        assertThat(forTri).hasStatusOk();
        assertThat(strings(forTri, "$.cc[*].fullName")).containsExactly("Cao Minh Trí");
        assertThat(JsonPath.<Object>read(body(forTri), "$.approval")).isNull();
        assertThat(JsonPath.<Object>read(body(forTri), "$.balance")).isNull();
        assertThat(get(hrBearer, id)).hasStatus(404);
        assertCode(post(anBearer, "/api/leave-requests", request(annual, day.plusDays(7), "FULL", day.plusDays(7),
                "FULL", null).replace("\"cc\":[]", "\"cc\":[\"" + an + "\"]")), 400, "validation.invalid");
    }

    @Test
    void thePeopleCopiedAreToldOfANewRequestAndTheApproverOfACancelledApprovedOne() {
        LocalDate day = workingDay(7, DayOfWeek.MONDAY);
        MvcTestResult candidates = mvc.get().uri("/api/leave-requests/cc-candidates?q={q}", "Trí")
                .header(HttpHeaders.AUTHORIZATION, anBearer).exchange();
        assertThat(strings(candidates, "$[*].fullName")).containsExactly("Cao Minh Trí");
        String json = request(annual, day, "FULL", day, "FULL", null).replace("\"cc\":[]", "\"cc\":[\"" + tri + "\"]");

        String id = submit(json);

        MvcTestResult triBell = notifications(triBearer);
        assertThat(strings(triBell, "$.items[*].kind")).containsExactly("LEAVE_COPIED");
        assertThat(triBell).bodyJson().extractingPath("$.items[0].requestId").isEqualTo(id);
        assertThat(triBell).bodyJson().extractingPath("$.items[0].actor.fullName").isEqualTo("Nguyễn Văn An");
        assertThat(decide(hungBearer, id, "approve", null)).hasStatusOk();
        assertThat(post(anBearer, "/api/leave-requests/" + id + "/cancel", "{}")).hasStatusOk();
        assertThat(strings(notifications(hungBearer), "$.items[*].kind")).containsExactly("LEAVE_CANCELLED",
                "APPROVAL_WAITING");
    }

    @Test
    void theApproverSeesWhoElseOfTheUnitIsOff() {
        LocalDate day = workingDay(7, DayOfWeek.WEDNESDAY);
        submit(triBearer, request(annual, day, "FULL", day, "FULL", null));
        String id = submit(request(annual, day, "MORNING", day, "MORNING", null));

        assertThat(strings(get(hungBearer, id), "$.unitAbsences[*].employee.fullName"))
                .containsExactly("Cao Minh Trí");
    }

    // ------------------------------------------------------------------------------------------- balances, access

    @Test
    void balancesAreOwnOrNeedEmployeeView() {
        MvcTestResult own = mvc.get().uri("/api/leave-balances").header(HttpHeaders.AUTHORIZATION, anBearer)
                .exchange();
        assertThat(own).hasStatusOk();
        assertThat(strings(own, "$.items[*].leaveType.code")).containsExactly("PN", "OM", "TS", "VR", "KL");
        assertThat(own).bodyJson().extractingPath("$.year").isEqualTo(today.getYear());
        assertThat(number(own, "$.items[0].balance.entitled")).isEqualByComparingTo("12");
        assertThat(number(own, "$.items[0].balance.accrued"))
                .isEqualByComparingTo(BigDecimal.valueOf(today.getMonthValue()));

        assertThat(mvc.get().uri("/api/leave-balances?employeeId={id}", an).header(HttpHeaders.AUTHORIZATION, triBearer)
                .exchange()).hasStatus(403);
        assertThat(mvc.get().uri("/api/leave-balances?employeeId={id}", an).header(HttpHeaders.AUTHORIZATION, hrBearer)
                .exchange()).hasStatusOk();
        assertCode(mvc.get().uri("/api/leave-balances").header(HttpHeaders.AUTHORIZATION, testAccounts.adminBearer(mvc))
                .exchange(), 403, "approval.no_employee");
    }

    @Test
    void myRequestsAreListedLatestFirst() {
        LocalDate first = workingDay(7, DayOfWeek.MONDAY);
        LocalDate second = workingDay(7, DayOfWeek.THURSDAY);
        submit(request(annual, first, "FULL", first, "FULL", null));
        submit(request(annual, second, "FULL", second, "FULL", null));

        MvcTestResult mine = mvc.get().uri("/api/leave-requests?year={y}", first.getYear())
                .header(HttpHeaders.AUTHORIZATION, anBearer).exchange();

        assertThat(mine).hasStatusOk();
        List<String> starts = strings(mine, "$.items[*].startDate");
        assertThat(starts).hasSizeGreaterThanOrEqualTo(1);
        assertThat(starts).isSortedAccordingTo(Comparator.reverseOrder());
    }

    @Test
    void fieldsAreCheckedAllAtOnce() {
        MvcTestResult refused = post(anBearer, "/api/leave-requests/check", """
                {"leaveTypeId": null, "startDate": null, "startPart": "FULL", "endDate": "2026-10-21",
                 "endPart": null, "cc": [], "attachmentIds": []}""");

        assertCode(refused, 400, "validation.invalid");
        assertThat(strings(refused, "$.errors[*].field")).containsExactly("leaveTypeId", "startDate", "endPart");
    }

    // --------------------------------------------------------------------------------- policies and work schedule

    @Test
    void everyoneReadsTheActiveTypesAndOnlyHrChangesThePolicyWhichIsAudited() {
        MvcTestResult types = mvc.get().uri("/api/leave-types").header(HttpHeaders.AUTHORIZATION, anBearer).exchange();
        assertThat(types).hasStatusOk();
        assertThat(types).bodyJson().extractingPath("$.canEdit").isEqualTo(false);
        assertThat(strings(types, "$.items[0].versions")).isEmpty();
        assertThat(types).bodyJson().extractingPath("$.items[0].policy.entitlementDays").isEqualTo(12.0);
        assertThat(mvc.get().uri("/api/leave-types?all=true").header(HttpHeaders.AUTHORIZATION, anBearer).exchange())
                .hasStatus(403);
        String policy = """
                {"effectiveFrom": "2099-01-01", "pay": "COMPANY", "halfDayAllowed": true,
                 "attachmentRequired": false, "limited": true, "entitlementDays": 14, "seniorityStepYears": 5,
                 "accrual": "MONTHLY", "cutOffDay": 15, "advanceAllowed": true, "maxDaysPerRequest": null,
                 "carryOverMaxDays": 5, "carryOverExpiry": "03-31"}""";
        assertThat(put(anBearer, "/api/leave-types/" + annual + "/policy", policy)).hasStatus(403);

        MvcTestResult saved = put(hrBearer, "/api/leave-types/" + annual + "/policy", policy);

        assertThat(saved).hasStatusOk();
        assertThat(strings(saved, "$.versions[*].effectiveFrom")).containsExactly("2000-01-01", "2099-01-01");
        // Today's policy is still the old one.
        assertThat(saved).bodyJson().extractingPath("$.policy.entitlementDays").isEqualTo(12.0);
        assertThat(jdbc.queryForObject("""
                select count(*) from audit_log where entity_type = 'LEAVE_POLICY' and entity_id = ?::uuid
                  and summary like '%2099-01-01 added'""", Long.class, annual)).isPositive();
    }

    @Test
    void aPolicyIsCheckedAllAtOnceAndANewTypeCanBeAdded() {
        MvcTestResult refused = put(hrBearer, "/api/leave-types/" + annual + "/policy", """
                {"effectiveFrom": null, "pay": "COMPANY", "halfDayAllowed": true, "attachmentRequired": false,
                 "limited": true, "entitlementDays": 0.3, "accrual": null, "cutOffDay": 40,
                 "advanceAllowed": false, "carryOverExpiry": "02-30"}""");
        assertCode(refused, 400, "validation.invalid");
        assertThat(strings(refused, "$.errors[*].field")).containsExactlyInAnyOrder("effectiveFrom", "cutOffDay",
                "entitlementDays", "accrual", "carryOverExpiry");

        MvcTestResult created = post(hrBearer, "/api/leave-types", """
                {"code": "zt-hieu", "name": "Nghỉ hiếu hỷ", "policy": {"effectiveFrom": "2000-01-01",
                 "pay": "COMPANY", "halfDayAllowed": false, "attachmentRequired": false, "limited": false,
                 "cutOffDay": 15, "advanceAllowed": false, "maxDaysPerRequest": 3}}""");
        assertThat(created).hasStatus(201);
        assertThat(created).bodyJson().extractingPath("$.code").isEqualTo("ZT-HIEU");
        assertCode(post(hrBearer, "/api/leave-types", """
                {"code": "ZT-HIEU", "name": "Again", "policy": {"effectiveFrom": "2000-01-01", "pay": "UNPAID",
                 "halfDayAllowed": true, "attachmentRequired": false, "limited": false}}"""), 400,
                "validation.invalid");
    }

    @Test
    void aSaturdayMorningInTheLichLamViecCountsHalf() {
        assertThat(mvc.get().uri("/api/work-schedule").header(HttpHeaders.AUTHORIZATION, anBearer).exchange())
                .bodyJson().extractingPath("$.days.SATURDAY").isEqualTo("OFF");
        String saturdayMorning = """
                {"days": {"MONDAY": "FULL", "TUESDAY": "FULL", "WEDNESDAY": "FULL", "THURSDAY": "FULL",
                 "FRIDAY": "FULL", "SATURDAY": "MORNING", "SUNDAY": "OFF"}}""";
        assertThat(put(anBearer, "/api/work-schedule", saturdayMorning)).hasStatus(403);
        assertThat(put(testAccounts.adminBearer(mvc), "/api/work-schedule", saturdayMorning)).hasStatusOk();
        LocalDate saturday = workingDay(7, DayOfWeek.FRIDAY).plusDays(1);

        MvcTestResult check = post(anBearer, "/api/leave-requests/check",
                request(annual, saturday, "FULL", saturday, "FULL", null));

        assertThat(number(check, "$.total")).isEqualByComparingTo(holiday(saturday) ? "0" : "0.5");
    }

    // ------------------------------------------------------------------------------------------------- helpers

    /** The first day at least {@code minDaysAhead} from today on that weekday that is no holiday. */
    LocalDate workingDay(int minDaysAhead, DayOfWeek weekday) {
        LocalDate day = today.plusDays(minDaysAhead);
        while (day.getDayOfWeek() != weekday || holiday(day)) {
            day = day.plusDays(1);
        }
        return day;
    }

    boolean holiday(LocalDate day) {
        return jdbc.queryForObject("""
                select count(*) from catalog_item where catalog = 'HOLIDAY' and active
                  and start_date <= ? and end_date >= ?""", Long.class, day, day) > 0;
    }

    String typeId(String code) {
        return jdbc.queryForObject("select id::text from leave_type where code = ?", String.class, code);
    }

    static String request(String type, LocalDate start, String startPart, LocalDate end, String endPart,
            String reason) {
        return """
                {"leaveTypeId": "%s", "startDate": "%s", "startPart": "%s", "endDate": "%s", "endPart": "%s",
                 "reason": %s, "cc":[], "attachmentIds":[]}""".formatted(type, start, startPart, end, endPart,
                reason == null ? "null" : "\"" + reason + "\"");
    }

    String submit(String json) {
        return submit(anBearer, json);
    }

    String submit(String bearer, String json) {
        MvcTestResult sent = post(bearer, "/api/leave-requests", json);
        assertThat(sent).hasStatus(201);
        return JsonPath.read(body(sent), "$.id");
    }

    /** The balance of one type for the caller in a year, as JSON. */
    String balance(String bearer, int year, String code) {
        MvcTestResult balances = mvc.get().uri("/api/leave-balances?year={y}", year)
                .header(HttpHeaders.AUTHORIZATION, bearer).exchange();
        assertThat(balances).hasStatusOk();
        List<Object> found = JsonPath.read(body(balances), "$.items[?(@.leaveType.code == '" + code + "')].balance");
        return JsonPath.parse(found.get(0)).jsonString();
    }

    static BigDecimal number(String json, String field) {
        Object value = JsonPath.read(json, "$." + field);
        return new BigDecimal(String.valueOf(value));
    }

    static BigDecimal number(MvcTestResult result, String path) {
        return new BigDecimal(String.valueOf((Object) JsonPath.read(body(result), path)));
    }

    String signedIn(UUID employee, Role role) {
        TestAccount account = testAccounts.create(role);
        testEmployees.link(account.id(), employee);
        return testAccounts.bearer(mvc, account);
    }

    MvcTestResult post(String bearer, String uri, String json) {
        return mvc.post().uri(uri).header(HttpHeaders.AUTHORIZATION, bearer).contentType(MediaType.APPLICATION_JSON)
                .content(json).exchange();
    }

    MvcTestResult put(String bearer, String uri, String json) {
        return mvc.put().uri(uri).header(HttpHeaders.AUTHORIZATION, bearer).contentType(MediaType.APPLICATION_JSON)
                .content(json).exchange();
    }

    MvcTestResult get(String bearer, String id) {
        return mvc.get().uri("/api/leave-requests/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    MvcTestResult decide(String bearer, String id, String action, String comment) {
        String json = comment == null ? "{}" : "{\"comment\":\"" + comment + "\"}";
        return mvc.post().uri("/api/approvals/{id}/{action}", id, action).header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    MvcTestResult notifications(String bearer) {
        MvcTestResult bell = mvc.get().uri("/api/notifications").header(HttpHeaders.AUTHORIZATION, bearer).exchange();
        assertThat(bell).hasStatusOk();
        return bell;
    }

    static String body(MvcTestResult result) {
        try {
            return result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        } catch (java.io.UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }

    static List<String> strings(MvcTestResult result, String path) {
        return JsonPath.read(body(result), path);
    }

    static void assertCode(MvcTestResult result, int status, String code) {
        assertThat(result).hasStatus(status);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo(code);
    }
}
