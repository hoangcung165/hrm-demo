package com.hrmdemo.service.approval;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import javax.sql.DataSource;

import com.hrmdemo.dto.approval.ApprovalRequestResponse;
import com.hrmdemo.dto.approval.ApprovalRequestType;
import com.hrmdemo.dto.approval.ApprovalStatus;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.MutableClock;
import com.hrmdemo.support.TestAccounts;
import com.hrmdemo.support.TestEmployees;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Tự duyệt by the background job against real PostgreSQL, with a clock the test moves forward. Nhóm Web (head Hùng,
 * member An) sits under the company; Mai is HR, Lan the Kế toán and Quang the Giám đốc. Profile updates use the
 * default flow: Quản lý trực tiếp, then HR, each approving itself after 3 days.
 */
@IntegrationTest
@Import(ApprovalAutoApproveJobIT.Clocks.class)
class ApprovalAutoApproveJobIT {

    static final Instant START = Instant.parse("2026-10-05T02:00:00Z");

    @TestConfiguration(proxyBeanMethods = false)
    static class Clocks {

        @Bean
        @Primary
        MutableClock testClock() {
            return new MutableClock(START);
        }
    }

    @Autowired
    ApprovalAutoApproveJob job;
    @Autowired
    ApprovalRequestService requests;
    @Autowired
    MutableClock clock;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    TestEmployees testEmployees;
    @Autowired
    DataSource dataSource;

    JdbcTemplate jdbc;
    UUID an;
    UUID hung;
    UUID mai;
    CurrentAccount anAccount;
    CurrentAccount hungAccount;

    @BeforeEach
    void setUp() {
        clock.set(START);
        jdbc = new JdbcTemplate(dataSource);
        testEmployees.deleteAll();
        jdbc.update("delete from approval_flow_setting");
        jdbc.update("delete from org_unit");
        UUID web = unit("WEB", "Nhóm Web");
        hung = testEmployees.create("Lê Văn Hùng", web);
        an = testEmployees.create("Nguyễn Văn An", web);
        mai = testEmployees.create("Trần Thị Mai", null);
        testEmployees.makeHead(web, hung);
        anAccount = account(an, Role.EMPLOYEE);
        hungAccount = account(hung, Role.LINE_MANAGER);
        account(mai, Role.HR);
        account(testEmployees.create("Phạm Thị Lan", null), Role.ACCOUNTANT);
        account(testEmployees.create("Võ Minh Quang", null), Role.DIRECTOR);
    }

    @AfterEach
    void cleanUp() {
        testEmployees.deleteAll();
        jdbc.update("delete from org_unit");
    }

    @Test
    void aDueLevelApprovesItselfOnceAndTheNextLevelIsTold() {
        UUID id = requests.submit(an, ApprovalRequestType.PROFILE_UPDATE, null, "Số điện thoại");

        clock.advance(Duration.ofDays(3).minusMinutes(1));
        assertThat(job.run()).isZero();
        assertThat(requests.get(hungAccount, id).level()).isEqualTo(1);

        clock.advance(Duration.ofMinutes(1));
        assertThat(job.run()).isEqualTo(1);
        // The next run finds nothing more to do: the level is approved once.
        assertThat(job.run()).isZero();

        ApprovalRequestResponse moved = requests.get(anAccount, id);
        assertThat(moved.status()).isEqualTo(ApprovalStatus.PENDING);
        assertThat(moved.level()).isEqualTo(2);
        assertThat(moved.autoApproveDays()).isEqualTo(3);
        assertThat(moved.autoApproveDueAt()).isEqualTo(clock.instant().plus(Duration.ofDays(3)));
        assertThat(events(id)).containsExactly("SUBMITTED", "LEVEL_REACHED", "AUTO_APPROVED", "LEVEL_APPROVED",
                "LEVEL_REACHED");
        assertThat(jdbc.queryForObject("select actor_id from approval_request_log where request_id = ? "
                + "and event = 'AUTO_APPROVED'", UUID.class, id)).isNull();
        assertThat(kinds(mai)).containsExactly("APPROVAL_WAITING");

        clock.advance(Duration.ofDays(3));
        assertThat(job.run()).isEqualTo(1);
        assertThat(requests.get(anAccount, id).status()).isEqualTo(ApprovalStatus.APPROVED);
        assertThat(kinds(an)).containsExactly("APPROVAL_APPROVED");
    }

    @Test
    void payrollAndFlowsWithoutADelayNeverApproveThemselves() {
        UUID payroll = requests.submit(an, ApprovalRequestType.PAYROLL, null, "Bảng lương tháng 10/2026");
        UUID overtime = requests.submit(an, ApprovalRequestType.OVERTIME, null, "Tăng ca 12/10");

        clock.advance(Duration.ofDays(60));

        assertThat(requests.dueForAutoApprove()).isEmpty();
        assertThat(job.run()).isZero();
        assertThat(events(payroll)).doesNotContain("AUTO_APPROVED");
        assertThat(events(overtime)).doesNotContain("AUTO_APPROVED");
    }

    @Test
    void aReturnedRequestWaitsForTheSenderAndThenOnlyTheTimeLeft() {
        UUID id = requests.submit(an, ApprovalRequestType.PROFILE_UPDATE, null, "Địa chỉ");
        clock.advance(Duration.ofDays(2));
        requests.returnForInfo(hungAccount, id, "Thiếu giấy tờ");

        clock.advance(Duration.ofDays(10));
        assertThat(job.run()).isZero();
        assertThat(requests.get(anAccount, id).status()).isEqualTo(ApprovalStatus.RETURNED_FOR_INFO);

        requests.resubmit(anAccount, id, "Đã bổ sung");
        clock.advance(Duration.ofHours(23));
        assertThat(job.run()).isZero();
        // Two days were waited before the return, so one is left.
        clock.advance(Duration.ofHours(1));
        assertThat(job.run()).isEqualTo(1);
        assertThat(requests.get(anAccount, id).level()).isEqualTo(2);
    }

    @Test
    void twoInstancesRunningAtOnceApproveTheLevelOnce() throws Exception {
        List<UUID> ids = List.of(
                requests.submit(an, ApprovalRequestType.PROFILE_UPDATE, null, "Email"),
                requests.submit(an, ApprovalRequestType.PROFILE_UPDATE, null, "Số tài khoản"),
                requests.submit(an, ApprovalRequestType.LEAVE, null, "Nghỉ phép 20/10"));
        clock.advance(Duration.ofDays(3));

        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Callable<Integer> instance = job::run;
            List<Future<Integer>> runs = pool.invokeAll(List.of(instance, instance));
            assertThat(runs.get(0).get() + runs.get(1).get()).isEqualTo(3);
        } finally {
            pool.shutdown();
        }

        for (UUID id : ids) {
            assertThat(events(id)).filteredOn("AUTO_APPROVED"::equals).hasSize(1);
        }
        assertThat(requests.get(anAccount, ids.get(2)).status()).isEqualTo(ApprovalStatus.APPROVED);
        assertThat(kinds(mai)).containsExactly("APPROVAL_WAITING", "APPROVAL_WAITING");
    }

    List<String> events(UUID requestId) {
        return jdbc.queryForList("select event from approval_request_log where request_id = ? order by seq",
                String.class, requestId);
    }

    List<String> kinds(UUID recipient) {
        return jdbc.queryForList("select kind from notification where recipient_id = ? order by created_at",
                String.class, recipient);
    }

    UUID unit(String code, String name) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into org_unit (id, legal_entity_id, parent_id, code, name, type, created_at, updated_at)
                values (?, (select id from legal_entity), null, ?, ?, 'TEAM', now(), now())""", id, code, name);
        return id;
    }

    CurrentAccount account(UUID employee, Role role) {
        TestAccounts.TestAccount account = testAccounts.create(role);
        testEmployees.link(account.id(), employee);
        return new CurrentAccount(account.id(), employee, Set.of(role.name()));
    }
}
