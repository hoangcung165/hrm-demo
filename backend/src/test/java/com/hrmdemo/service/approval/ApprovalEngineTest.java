package com.hrmdemo.service.approval;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.approval.ApprovalRequestType;
import com.hrmdemo.dto.approval.ApprovalStatus;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.service.approval.ApprovalEvent.Type;
import com.hrmdemo.service.approval.ResolvedApprovers.EscalationStep;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;

/**
 * Luồng phê duyệt: the cases HRM-12 lists (escalation, delegation, reject and return, 1/2/3 levels, reject midway,
 * auto-approve, wrong approver, events on the final transition), on the example company's people.
 */
class ApprovalEngineTest {

    static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    /** 07/10/2026 09:12 in Hà Nội. */
    static final Instant T0 = Instant.parse("2026-10-07T02:12:00Z");
    static final LocalDate DAY0 = LocalDate.of(2026, 10, 7);

    // Nhóm Web: An and Trí report to Hùng; Hùng to Khoa (head of Phòng Phát triển phần mềm); Khoa to Bảo.
    static final UUID AN = id("an");
    static final UUID TRI = id("tri");
    static final UUID HUNG = id("hung");
    static final UUID KHOA = id("khoa");
    static final UUID BAO = id("bao");
    // Lan is a PM in Khoa's department; Giang has no manager of her own but sits under Khoa's unit.
    static final UUID LAN = id("lan");
    static final UUID GIANG = id("giang");
    // HR: Mai and Hân. Accountant: Thu.
    static final UUID MAI = id("mai");
    static final UUID HAN = id("han");
    static final UUID THU = id("thu");
    static final UUID PROJECT = id("project");

    final FakeDirectory directory = new FakeDirectory();
    final FakeDelegations delegations = new FakeDelegations();
    final ApprovalEngine engine = new ApprovalEngine(directory, delegations, ZONE);

    {
        directory.managers.putAll(Map.of(AN, HUNG, TRI, HUNG, HUNG, KHOA, KHOA, BAO, LAN, KHOA, HAN, MAI));
        directory.parentHeads.putAll(Map.of(AN, KHOA, TRI, KHOA, GIANG, KHOA, LAN, BAO));
        directory.roles.put(Role.HR, new HashSet<>(Set.of(MAI, HAN)));
        directory.roles.put(Role.ACCOUNTANT, new HashSet<>(Set.of(THU)));
        directory.roles.put(Role.DIRECTOR, new HashSet<>(Set.of(BAO)));
        directory.projectManagers.put(PROJECT, LAN);
    }

    static ApprovalFlow flow(ApprovalRequestType type, Integer autoApproveDays, boolean delegation,
            ApprovalLevel... levels) {
        return new ApprovalFlow(type, List.of(levels), autoApproveDays, delegation);
    }

    static ApprovalFlow profileUpdate(ApprovalLevel... levels) {
        return flow(ApprovalRequestType.PROFILE_UPDATE, 3, true, levels);
    }

    ApprovalRequestState submit(ApprovalFlow flow, UUID sender) {
        return engine.submit(id("request"), flow, sender, null, T0).state();
    }

    @Nested
    class Levels {

        @Test
        void oneLevelIsApprovedByTheSendersLineManagerAndTheSenderHearsOfIt() {
            ApprovalTransition sent = engine.submit(id("request"), profileUpdate(ApprovalLevel.lineManager()), AN,
                    null, T0);

            assertThat(sent.state().status()).isEqualTo(ApprovalStatus.PENDING);
            assertThat(sent.state().level()).isEqualTo(1);
            assertThat(sent.state().approvers()).containsExactly(HUNG);
            assertThat(types(sent)).containsExactly(Type.SUBMITTED, Type.LEVEL_REACHED);
            assertThat(sent.events().get(1).recipients()).containsExactly(HUNG);

            ApprovalTransition approved = engine.approve(sent.state(), HUNG, "Đã kiểm tra", T0.plusSeconds(60));

            assertThat(approved.state().status()).isEqualTo(ApprovalStatus.APPROVED);
            assertThat(approved.state().approvers()).isEmpty();
            ApprovalEvent last = approved.events().get(0);
            assertThat(last.type()).isEqualTo(Type.APPROVED);
            assertThat(last.actorId()).isEqualTo(HUNG);
            assertThat(last.comment()).isEqualTo("Đã kiểm tra");
            assertThat(last.recipients()).containsExactly(AN);
        }

        @Test
        void twoLevelsGoFromTheLineManagerToAnyHrWhoIsNotTheSender() {
            ApprovalRequestState pending = submit(profileUpdate(ApprovalLevel.lineManager(),
                    ApprovalLevel.role(Role.HR)), AN);

            ApprovalTransition first = engine.approve(pending, HUNG, null, T0.plusSeconds(60));

            assertThat(types(first)).containsExactly(Type.LEVEL_APPROVED, Type.LEVEL_REACHED);
            assertThat(first.state().level()).isEqualTo(2);
            assertThat(first.state().approvers()).containsExactlyInAnyOrder(MAI, HAN);
            assertThat(first.state().levelReachedAt()).isEqualTo(T0.plusSeconds(60));

            ApprovalTransition last = engine.approve(first.state(), HAN, null, T0.plusSeconds(120));

            assertThat(last.state().status()).isEqualTo(ApprovalStatus.APPROVED);
            assertThat(types(last)).containsExactly(Type.APPROVED);
        }

        @Test
        void threeLevelsOfPayrollEndApprovedAfterTheThirdAndSkipTheSenderInTheirRole() {
            ApprovalFlow payroll = flow(ApprovalRequestType.PAYROLL, null, false, ApprovalLevel.role(Role.HR),
                    ApprovalLevel.role(Role.ACCOUNTANT), ApprovalLevel.role(Role.DIRECTOR));
            ApprovalRequestState state = submit(payroll, MAI);
            assertThat(state.approvers()).containsExactly(HAN);
            assertThat(state.escalated()).isFalse();

            state = engine.approve(state, HAN, null, T0).state();
            assertThat(state.approvers()).containsExactly(THU);
            state = engine.approve(state, THU, null, T0).state();
            assertThat(state.approvers()).containsExactly(BAO);
            ApprovalTransition last = engine.approve(state, BAO, null, T0);

            assertThat(last.state().status()).isEqualTo(ApprovalStatus.APPROVED);
            assertThat(last.events()).extracting(ApprovalEvent::type, ApprovalEvent::level)
                    .containsExactly(org.assertj.core.groups.Tuple.tuple(Type.APPROVED, 3));
        }
    }

    @Nested
    class RejectAndReturn {

        final ApprovalFlow threeLevels = profileUpdate(ApprovalLevel.lineManager(), ApprovalLevel.role(Role.HR),
                ApprovalLevel.role(Role.DIRECTOR));

        @Test
        void aRejectMidwayEndsTheRequestAndItCannotBeSentAgain() {
            ApprovalRequestState atLevelTwo = engine.approve(submit(threeLevels, AN), HUNG, null, T0).state();

            ApprovalTransition rejected = engine.reject(atLevelTwo, MAI, "  Thiếu giấy tờ  ", T0.plusSeconds(60));

            assertThat(rejected.state().status()).isEqualTo(ApprovalStatus.REJECTED);
            assertThat(rejected.state().level()).isEqualTo(2);
            ApprovalEvent event = rejected.events().get(0);
            assertThat(event.type()).isEqualTo(Type.REJECTED);
            assertThat(event.comment()).isEqualTo("Thiếu giấy tờ");
            assertThat(event.recipients()).containsExactly(AN);
            assertCode(() -> engine.approve(rejected.state(), HAN, null, T0), "approval.already_handled");
            assertCode(() -> engine.resubmit(rejected.state(), AN, null, T0), "approval.not_returned");
        }

        @Test
        void rejectAndReturnNeedAReason() {
            ApprovalRequestState pending = submit(threeLevels, AN);

            assertCode(() -> engine.reject(pending, HUNG, "   ", T0), "approval.reason_required");
            assertCode(() -> engine.returnForInfo(pending, HUNG, null, T0), "approval.reason_required");
        }

        @Test
        void aReturnedRequestContinuesAtTheLevelThatReturnedIt() {
            ApprovalRequestState atLevelTwo = engine.approve(submit(threeLevels, AN), HUNG, null, T0).state();

            ApprovalTransition returned = engine.returnForInfo(atLevelTwo, HAN, "Ghi rõ số nhà", T0.plusSeconds(60));

            assertThat(returned.state().status()).isEqualTo(ApprovalStatus.RETURNED_FOR_INFO);
            assertThat(returned.state().approvers()).isEmpty();
            assertThat(returned.events().get(0).recipients()).containsExactly(AN);
            assertCode(() -> engine.resubmit(returned.state(), HUNG, null, T0), "approval.not_sender");

            ApprovalTransition again = engine.resubmit(returned.state(), AN, "Đã bổ sung", T0.plusSeconds(120));

            assertThat(again.state().status()).isEqualTo(ApprovalStatus.PENDING);
            assertThat(again.state().level()).isEqualTo(2);
            assertThat(again.state().approvers()).containsExactlyInAnyOrder(MAI, HAN);
            assertThat(types(again)).containsExactly(Type.RESUBMITTED, Type.LEVEL_REACHED);
            assertThat(again.events().get(0).comment()).isEqualTo("Đã bổ sung");
        }

        @Test
        void theSenderCancelsAWaitingOrReturnedRequestOnly() {
            ApprovalRequestState pending = submit(threeLevels, AN);
            assertCode(() -> engine.cancel(pending, HUNG, T0), "approval.not_sender");

            ApprovalTransition cancelled = engine.cancel(pending, AN, T0);
            assertThat(cancelled.state().status()).isEqualTo(ApprovalStatus.CANCELLED);
            assertThat(types(cancelled)).containsExactly(Type.CANCELLED);

            ApprovalRequestState returned = engine.returnForInfo(submit(threeLevels, AN), HUNG, "Bổ sung", T0)
                    .state();
            assertThat(engine.cancel(returned, AN, T0).state().status()).isEqualTo(ApprovalStatus.CANCELLED);
            assertCode(() -> engine.cancel(cancelled.state(), AN, T0), "approval.already_handled");
        }
    }

    @Nested
    class WrongApprover {

        @Test
        void onlyTheApproversOfTheWaitingLevelMayAct() {
            ApprovalRequestState pending = submit(profileUpdate(ApprovalLevel.lineManager(),
                    ApprovalLevel.role(Role.HR)), AN);

            assertCode(() -> engine.approve(pending, MAI, null, T0), "approval.not_approver");
            assertCode(() -> engine.reject(pending, KHOA, "Không", T0), "approval.not_approver");
            assertCode(() -> engine.approve(pending, AN, null, T0), "approval.not_approver");
            assertThat(engine.actingAs(pending, HUNG, T0)).contains(new ApprovalEngine.Acting(HUNG, null));
            assertThat(engine.actingAs(pending, MAI, T0)).isEmpty();
        }

        @Test
        void theWrongApproverErrorIsForbidden() {
            ApprovalRequestState pending = submit(profileUpdate(ApprovalLevel.lineManager()), AN);

            assertThatThrownBy(() -> engine.approve(pending, MAI, null, T0))
                    .isInstanceOfSatisfying(ApiException.class,
                            e -> assertThat(e.getStatus().value()).isEqualTo(403));
        }
    }

    @Nested
    class Escalation {

        @Test
        void aPmWhoSendsTheirOwnTimesheetGoesToTheirLineManager() {
            ApprovalFlow timesheet = flow(ApprovalRequestType.TIMESHEET, 5, true, ApprovalLevel.projectManager());

            ApprovalTransition sent = engine.submit(id("timesheet"), timesheet, LAN, PROJECT, T0);

            assertThat(sent.state().approvers()).containsExactly(KHOA);
            assertThat(sent.state().escalated()).isTrue();
            assertThat(types(sent)).containsExactly(Type.SUBMITTED, Type.ESCALATED, Type.LEVEL_REACHED);
            assertThat(sent.events().get(1).escalatedTo()).isEqualTo(EscalationStep.SENDER_LINE_MANAGER);
        }

        @Test
        void withoutALineManagerItGoesToTheHeadOfTheUnitAbove() {
            ResolvedApprovers resolved = engine.resolve(profileUpdate(ApprovalLevel.lineManager()), 1, GIANG, null);

            assertThat(resolved.approvers()).containsExactly(KHOA);
            assertThat(resolved.escalatedTo()).isEqualTo(EscalationStep.PARENT_UNIT_HEAD);
        }

        @Test
        void withNobodyAboveItEndsWithTheHrRole() {
            ResolvedApprovers resolved = engine.resolve(profileUpdate(ApprovalLevel.lineManager()), 1, BAO, null);

            assertThat(resolved.approvers()).containsExactlyInAnyOrder(MAI, HAN);
            assertThat(resolved.escalatedTo()).isEqualTo(EscalationStep.HR_ROLE);
        }

        @Test
        void aRoleLevelWithAnotherHolderDoesNotEscalate() {
            ResolvedApprovers resolved = engine.resolve(profileUpdate(ApprovalLevel.role(Role.HR)), 1, HAN, null);

            assertThat(resolved.approvers()).containsExactly(MAI);
            assertThat(resolved.escalated()).isFalse();
        }

        @Test
        void theOnlyHrSendingToHrWithNobodyAboveHasNoApprover() {
            directory.roles.put(Role.HR, new HashSet<>(Set.of(MAI)));

            assertCode(() -> engine.submit(id("request"), profileUpdate(ApprovalLevel.role(Role.HR)), MAI, null,
                    T0), "approval.no_approver");
        }

        @Test
        void aTimesheetNamesItsProject() {
            ApprovalFlow timesheet = flow(ApprovalRequestType.TIMESHEET, 5, true, ApprovalLevel.projectManager());

            assertCode(() -> engine.submit(id("timesheet"), timesheet, AN, null, T0), "approval.project_required");
        }
    }

    @Nested
    class Delegation {

        final ApprovalFlow flow = profileUpdate(ApprovalLevel.lineManager());

        @Test
        void aDelegateApprovesARequestThatWasAlreadyWaitingAndTheLogNamesWhoTheyStoodInFor() {
            ApprovalRequestState pending = submit(flow, AN);
            delegations.add(HUNG, TRI, ApprovalRequestType.PROFILE_UPDATE, DAY0, DAY0.plusDays(3));

            ApprovalTransition approved = engine.approve(pending, TRI, null, T0.plusSeconds(60));

            ApprovalEvent event = approved.events().get(0);
            assertThat(event.actorId()).isEqualTo(TRI);
            assertThat(event.onBehalfOf()).isEqualTo(HUNG);
        }

        @Test
        void theDelegatorKeepsActingInTheirOwnName() {
            delegations.add(HUNG, TRI, ApprovalRequestType.PROFILE_UPDATE, DAY0, DAY0.plusDays(3));

            ApprovalEvent event = engine.approve(submit(flow, AN), HUNG, null, T0).events().get(0);

            assertThat(event.onBehalfOf()).isNull();
        }

        @Test
        void aDelegationCountsOnlyForItsTypesItsDaysAndFlowsThatAllowIt() {
            ApprovalRequestState pending = submit(flow, AN);
            delegations.add(HUNG, TRI, ApprovalRequestType.LEAVE, DAY0, DAY0.plusDays(3));
            assertThat(engine.actingAs(pending, TRI, T0)).isEmpty();

            delegations.add(HUNG, TRI, ApprovalRequestType.PROFILE_UPDATE, DAY0.plusDays(1), DAY0.plusDays(3));
            assertThat(engine.actingAs(pending, TRI, T0)).isEmpty();
            assertThat(engine.actingAs(pending, TRI, T0.plus(Duration.ofDays(1)))).isPresent();

            ApprovalRequestState noDelegation = submit(flow(ApprovalRequestType.PROFILE_UPDATE, null, false,
                    ApprovalLevel.lineManager()), AN);
            assertCode(() -> engine.approve(noDelegation, TRI, null, T0.plus(Duration.ofDays(1))),
                    "approval.not_approver");
        }

        @Test
        void aDelegateNeverApprovesTheirOwnRequest() {
            delegations.add(HUNG, TRI, ApprovalRequestType.PROFILE_UPDATE, DAY0, DAY0.plusDays(3));

            ApprovalRequestState trisOwn = submit(flow, TRI);

            assertThat(trisOwn.approvers()).containsExactly(HUNG);
            assertCode(() -> engine.approve(trisOwn, TRI, null, T0), "approval.not_approver");
        }
    }

    @Nested
    class AutoApprove {

        @Test
        void aLevelApprovesItselfAfterTheFlowsDaysAsTheSystem() {
            ApprovalRequestState pending = submit(profileUpdate(ApprovalLevel.lineManager(),
                    ApprovalLevel.role(Role.HR)), AN);
            assertThat(pending.autoApproveDueAt()).contains(T0.plus(Duration.ofDays(3)));

            assertThat(engine.autoApprove(pending, T0.plus(Duration.ofDays(3)).minusSeconds(1))).isEmpty();
            ApprovalTransition auto = engine.autoApprove(pending, T0.plus(Duration.ofDays(3))).orElseThrow();

            assertThat(types(auto)).containsExactly(Type.AUTO_APPROVED, Type.LEVEL_APPROVED, Type.LEVEL_REACHED);
            assertThat(auto.events().get(1).actorId()).isNull();
            assertThat(auto.state().level()).isEqualTo(2);
            assertThat(auto.state().autoApproveDueAt()).contains(T0.plus(Duration.ofDays(6)));
        }

        @Test
        void theLastLevelAutoApprovedApprovesTheRequest() {
            ApprovalRequestState pending = submit(profileUpdate(ApprovalLevel.lineManager()), AN);

            ApprovalTransition auto = engine.autoApprove(pending, T0.plus(Duration.ofDays(4))).orElseThrow();

            assertThat(auto.state().status()).isEqualTo(ApprovalStatus.APPROVED);
            assertThat(types(auto)).containsExactly(Type.AUTO_APPROVED, Type.APPROVED);
        }

        @Test
        void theClockPausesWhileTheRequestIsWithTheSender() {
            ApprovalRequestState pending = submit(profileUpdate(ApprovalLevel.lineManager()), AN);
            ApprovalRequestState returned = engine.returnForInfo(pending, HUNG, "Bổ sung",
                    T0.plus(Duration.ofDays(1))).state();
            assertThat(returned.autoApproveDueAt()).isEmpty();
            assertThat(engine.autoApprove(returned, T0.plus(Duration.ofDays(10)))).isEmpty();

            ApprovalRequestState again = engine.resubmit(returned, AN, null, T0.plus(Duration.ofDays(5))).state();

            // One day waited before the return, two left after the resubmit.
            assertThat(again.autoApproveDueAt()).contains(T0.plus(Duration.ofDays(7)));
        }

        @Test
        void aFlowWithoutDaysNeverAutoApproves() {
            ApprovalRequestState pending = submit(flow(ApprovalRequestType.OVERTIME, null, true,
                    ApprovalLevel.lineManager()), AN);

            assertThat(pending.autoApproveDueAt()).isEmpty();
            assertThat(engine.autoApprove(pending, T0.plus(Duration.ofDays(365)))).isEmpty();
        }
    }

    @Nested
    class Flows {

        @Test
        void payrollIsNeverAutoApprovedNorDelegated() {
            assertCode(() -> flow(ApprovalRequestType.PAYROLL, 3, false, ApprovalLevel.role(Role.HR)),
                    "approval.flow_payroll_auto_approve");
            assertCode(() -> flow(ApprovalRequestType.PAYROLL, null, true, ApprovalLevel.role(Role.HR)),
                    "approval.flow_payroll_delegation");
        }

        @Test
        void aFlowHasOneToThreeLevelsAndAReasonableDelay() {
            assertCode(() -> flow(ApprovalRequestType.LEAVE, null, true), "approval.flow_levels");
            assertCode(() -> flow(ApprovalRequestType.LEAVE, null, true, ApprovalLevel.lineManager(),
                    ApprovalLevel.role(Role.HR), ApprovalLevel.role(Role.DIRECTOR), ApprovalLevel.role(Role.HR)),
                    "approval.flow_levels");
            assertCode(() -> flow(ApprovalRequestType.LEAVE, 0, true, ApprovalLevel.lineManager()),
                    "approval.flow_auto_approve_days");
            assertCode(() -> flow(ApprovalRequestType.LEAVE, 31, true, ApprovalLevel.lineManager()),
                    "approval.flow_auto_approve_days");
        }

        @Test
        void onlyTimesheetsGoToThePmAndARoleLevelNamesARole() {
            assertCode(() -> flow(ApprovalRequestType.LEAVE, null, true, ApprovalLevel.projectManager()),
                    "approval.flow_project_manager_only_timesheet");
            assertThatThrownBy(() -> new ApprovalLevel(com.hrmdemo.dto.approval.ApproverRule.ROLE, null))
                    .isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> new ApprovalLevel(com.hrmdemo.dto.approval.ApproverRule.LINE_MANAGER, Role.HR))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    static List<Type> types(ApprovalTransition transition) {
        return transition.events().stream().map(ApprovalEvent::type).toList();
    }

    static void assertCode(Executable action, String code) {
        assertThatThrownBy(action::execute)
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getCode()).isEqualTo(code));
    }

    static UUID id(String name) {
        return UUID.nameUUIDFromBytes(name.getBytes());
    }

    static final class FakeDirectory implements ApproverDirectory {
        final Map<UUID, UUID> managers = new HashMap<>();
        final Map<UUID, UUID> parentHeads = new HashMap<>();
        final Map<UUID, UUID> projectManagers = new HashMap<>();
        final Map<Role, Set<UUID>> roles = new HashMap<>();

        @Override
        public Optional<UUID> lineManagerOf(UUID employeeId) {
            return Optional.ofNullable(managers.get(employeeId));
        }

        @Override
        public Optional<UUID> parentUnitHeadOf(UUID employeeId) {
            return Optional.ofNullable(parentHeads.get(employeeId));
        }

        @Override
        public Optional<UUID> projectManagerOf(UUID projectId) {
            return Optional.ofNullable(projectManagers.get(projectId));
        }

        @Override
        public Set<UUID> employeesWithRole(Role role) {
            return roles.getOrDefault(role, Set.of());
        }
    }

    static final class FakeDelegations implements ApprovalDelegations {
        record Delegation(UUID approver, UUID delegate, ApprovalRequestType type, LocalDate from, LocalDate to) {
        }

        final List<Delegation> all = new ArrayList<>();

        void add(UUID approver, UUID delegate, ApprovalRequestType type, LocalDate from, LocalDate to) {
            all.add(new Delegation(approver, delegate, type, from, to));
        }

        @Override
        public Set<UUID> delegatesOf(UUID approverEmployeeId, ApprovalRequestType type, LocalDate date) {
            Set<UUID> delegates = new HashSet<>();
            for (Delegation d : all) {
                if (d.approver().equals(approverEmployeeId) && d.type() == type && !date.isBefore(d.from())
                        && !date.isAfter(d.to())) {
                    delegates.add(d.delegate());
                }
            }
            return delegates;
        }
    }
}
