package com.hrmdemo.service.approval;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.approval.ApprovalStatus;
import com.hrmdemo.dto.approval.ApproverRule;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.service.approval.ApprovalEvent.Type;
import com.hrmdemo.service.approval.ResolvedApprovers.EscalationStep;
import org.springframework.http.HttpStatus;

/**
 * Luồng phê duyệt (PRD deep module 5): the state machine shared by every request type.
 * <p>
 * {@code DRAFT → PENDING (level n) → APPROVED | REJECTED | RETURNED_FOR_INFO | CANCELLED}, with 1 to 3 levels.
 * Each level's approvers are resolved when the request reaches it, from the level's rule; nobody approves their own
 * request, so when the rule leaves only the sender (or nobody) the request goes up: the sender's Quản lý trực tiếp,
 * then the Trưởng đơn vị of the unit above, then the HR role. Ủy quyền duyệt is read live on every action, so a
 * delegate also sees requests that were waiting before the delegation started. Every action returns the new state
 * and the events it caused; the engine stores nothing.
 */
public final class ApprovalEngine {

    private final ApproverDirectory directory;
    private final ApprovalDelegations delegations;
    private final ZoneId zone;

    /**
     * @param zone the company's time zone: the day a delegation is checked against
     */
    public ApprovalEngine(ApproverDirectory directory, ApprovalDelegations delegations, ZoneId zone) {
        this.directory = Objects.requireNonNull(directory, "directory");
        this.delegations = Objects.requireNonNull(delegations, "delegations");
        this.zone = Objects.requireNonNull(zone, "zone");
    }

    /** Who acts on a request: the actor, and the approver they stand in for under an Ủy quyền duyệt (or null). */
    public record Acting(UUID actorId, UUID onBehalfOf) {
    }

    /** Sends a new request: it goes straight to level 1. */
    public ApprovalTransition submit(UUID requestId, ApprovalFlow flow, UUID senderId, UUID projectId,
            Instant now) {
        boolean needsProject = flow.levels().stream().anyMatch(l -> l.rule() == ApproverRule.PROJECT_MANAGER);
        if (needsProject && projectId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "approval.project_required",
                    "A request approved by the PM of a project names the project");
        }
        ApprovalRequestState draft = new ApprovalRequestState(requestId, flow, senderId, projectId,
                ApprovalStatus.DRAFT, 0, Set.of(), false, null, null);
        List<ApprovalEvent> events = new ArrayList<>();
        events.add(event(Type.SUBMITTED, draft, 1, senderId, null, null, Set.of(), now));
        ApprovalRequestState pending = enterLevel(draft, 1, now, events);
        return new ApprovalTransition(pending, events);
    }

    /**
     * The approvers of one level of a flow for a sender. Never contains the sender; throws when even the HR role
     * has nobody else.
     */
    public ResolvedApprovers resolve(ApprovalFlow flow, int level, UUID senderId, UUID projectId) {
        ApprovalLevel rule = flow.level(level);
        Set<UUID> own = switch (rule.rule()) {
            case LINE_MANAGER -> asSet(directory.lineManagerOf(senderId));
            case PROJECT_MANAGER -> projectId == null ? Set.of() : asSet(directory.projectManagerOf(projectId));
            case ROLE -> directory.employeesWithRole(rule.role());
        };
        Set<UUID> approvers = without(own, senderId);
        if (!approvers.isEmpty()) {
            return new ResolvedApprovers(approvers, false, null);
        }
        Set<UUID> manager = without(asSet(directory.lineManagerOf(senderId)), senderId);
        if (!manager.isEmpty()) {
            return new ResolvedApprovers(manager, true, EscalationStep.SENDER_LINE_MANAGER);
        }
        Set<UUID> parentHead = without(asSet(directory.parentUnitHeadOf(senderId)), senderId);
        if (!parentHead.isEmpty()) {
            return new ResolvedApprovers(parentHead, true, EscalationStep.PARENT_UNIT_HEAD);
        }
        Set<UUID> hr = without(directory.employeesWithRole(Role.HR), senderId);
        if (!hr.isEmpty()) {
            return new ResolvedApprovers(hr, true, EscalationStep.HR_ROLE);
        }
        throw new ApiException(HttpStatus.CONFLICT, "approval.no_approver",
                "Nobody but the sender can approve level " + level);
    }

    /**
     * Whether the Employee may act on the waiting level now, and for whom. The sender never may, not even as a
     * delegate.
     */
    public Optional<Acting> actingAs(ApprovalRequestState state, UUID actorId, Instant now) {
        if (state.status() != ApprovalStatus.PENDING || actorId == null || actorId.equals(state.senderId())) {
            return Optional.empty();
        }
        if (state.approvers().contains(actorId)) {
            return Optional.of(new Acting(actorId, null));
        }
        if (!state.flow().delegationAllowed()) {
            return Optional.empty();
        }
        LocalDate today = LocalDate.ofInstant(now, zone);
        return state.approvers().stream()
                .sorted()
                .filter(approver -> delegations.delegatesOf(approver, state.type(), today).contains(actorId))
                .findFirst()
                .map(approver -> new Acting(actorId, approver));
    }

    /** Duyệt: the waiting level is done; the request moves to the next level or, after the last, is approved. */
    public ApprovalTransition approve(ApprovalRequestState state, UUID actorId, String note, Instant now) {
        requirePending(state);
        Acting acting = requireApprover(state, actorId, now);
        List<ApprovalEvent> events = new ArrayList<>();
        return new ApprovalTransition(approveLevel(state, acting, blankToNull(note), now, events), events);
    }

    /** Từ chối: the request ends here, whatever the level. The reason is required and goes to the sender. */
    public ApprovalTransition reject(ApprovalRequestState state, UUID actorId, String reason, Instant now) {
        requirePending(state);
        Acting acting = requireApprover(state, actorId, now);
        String why = requireReason(reason);
        ApprovalEvent event = event(Type.REJECTED, state, state.level(), acting.actorId(), acting.onBehalfOf(), why,
                Set.of(state.senderId()), now);
        return new ApprovalTransition(state.ended(ApprovalStatus.REJECTED), List.of(event));
    }

    /**
     * Trả về để bổ sung: back to the sender, who resubmits; the request then continues at this level. Auto-approve
     * pauses meanwhile.
     */
    public ApprovalTransition returnForInfo(ApprovalRequestState state, UUID actorId, String reason, Instant now) {
        requirePending(state);
        Acting acting = requireApprover(state, actorId, now);
        String why = requireReason(reason);
        ApprovalEvent event = event(Type.RETURNED, state, state.level(), acting.actorId(), acting.onBehalfOf(), why,
                Set.of(state.senderId()), now);
        return new ApprovalTransition(state.returned(now), List.of(event));
    }

    /** The sender sends a returned request again; it waits at the level that returned it. */
    public ApprovalTransition resubmit(ApprovalRequestState state, UUID actorId, String note, Instant now) {
        requireSender(state, actorId);
        if (state.status() != ApprovalStatus.RETURNED_FOR_INFO) {
            throw new ApiException(HttpStatus.CONFLICT, "approval.not_returned",
                    "Only a request returned for more information can be sent again");
        }
        ResolvedApprovers resolved = resolve(state.flow(), state.level(), state.senderId(), state.projectId());
        ApprovalRequestState pending = state.resubmitted(resolved, now);
        List<ApprovalEvent> events = new ArrayList<>();
        events.add(event(Type.RESUBMITTED, pending, pending.level(), actorId, null, blankToNull(note), Set.of(), now));
        addLevelEvents(pending, resolved, now, events);
        return new ApprovalTransition(pending, events);
    }

    /** Đã hủy: the sender withdraws a request that is waiting or returned. */
    public ApprovalTransition cancel(ApprovalRequestState state, UUID actorId, Instant now) {
        requireSender(state, actorId);
        if (state.status() != ApprovalStatus.PENDING && state.status() != ApprovalStatus.RETURNED_FOR_INFO) {
            throw alreadyHandled(state);
        }
        ApprovalEvent event = event(Type.CANCELLED, state, state.level(), actorId, null, null, Set.of(), now);
        return new ApprovalTransition(state.ended(ApprovalStatus.CANCELLED), List.of(event));
    }

    /**
     * Tự duyệt: when the waiting level has waited the flow's delay, it approves itself as the system. Empty when
     * nothing is due (the background job calls this for every candidate).
     */
    public Optional<ApprovalTransition> autoApprove(ApprovalRequestState state, Instant now) {
        Optional<Instant> due = state.autoApproveDueAt();
        if (due.isEmpty() || now.isBefore(due.get())) {
            return Optional.empty();
        }
        List<ApprovalEvent> events = new ArrayList<>();
        events.add(event(Type.AUTO_APPROVED, state, state.level(), null, null, null, Set.of(), now));
        ApprovalRequestState next = approveLevel(state, new Acting(null, null), null, now, events);
        return Optional.of(new ApprovalTransition(next, events));
    }

    private ApprovalRequestState approveLevel(ApprovalRequestState state, Acting acting, String note, Instant now,
            List<ApprovalEvent> events) {
        if (state.isLastLevel()) {
            events.add(event(Type.APPROVED, state, state.level(), acting.actorId(), acting.onBehalfOf(), note,
                    Set.of(state.senderId()), now));
            return state.ended(ApprovalStatus.APPROVED);
        }
        events.add(event(Type.LEVEL_APPROVED, state, state.level(), acting.actorId(), acting.onBehalfOf(), note,
                Set.of(), now));
        return enterLevel(state, state.level() + 1, now, events);
    }

    private ApprovalRequestState enterLevel(ApprovalRequestState state, int level, Instant now,
            List<ApprovalEvent> events) {
        ResolvedApprovers resolved = resolve(state.flow(), level, state.senderId(), state.projectId());
        ApprovalRequestState next = state.atLevel(level, resolved, now);
        addLevelEvents(next, resolved, now, events);
        return next;
    }

    private static void addLevelEvents(ApprovalRequestState state, ResolvedApprovers resolved, Instant now,
            List<ApprovalEvent> events) {
        if (resolved.escalated()) {
            events.add(new ApprovalEvent(Type.ESCALATED, state.id(), state.type(), state.level(), null, null, null,
                    resolved.escalatedTo(), Set.of(), now));
        }
        events.add(event(Type.LEVEL_REACHED, state, state.level(), null, null, null, resolved.approvers(), now));
    }

    private Acting requireApprover(ApprovalRequestState state, UUID actorId, Instant now) {
        return actingAs(state, actorId, now).orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN,
                "approval.not_approver", "Not an approver of level " + state.level() + " of this request"));
    }

    private static void requirePending(ApprovalRequestState state) {
        if (state.status() != ApprovalStatus.PENDING) {
            throw alreadyHandled(state);
        }
    }

    private static void requireSender(ApprovalRequestState state, UUID actorId) {
        if (!state.senderId().equals(actorId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "approval.not_sender", "Only the sender can do this");
        }
    }

    private static String requireReason(String reason) {
        String why = blankToNull(reason);
        if (why == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "approval.reason_required",
                    "Rejecting or returning a request needs a reason");
        }
        return why;
    }

    private static ApiException alreadyHandled(ApprovalRequestState state) {
        return new ApiException(HttpStatus.CONFLICT, "approval.already_handled",
                "The request is no longer waiting for approval").with("status", state.status().name());
    }

    private static ApprovalEvent event(Type type, ApprovalRequestState state, int level, UUID actorId,
            UUID onBehalfOf, String comment, Set<UUID> recipients, Instant at) {
        return new ApprovalEvent(type, state.id(), state.type(), level, actorId, onBehalfOf, comment, null, recipients,
                at);
    }

    private static Set<UUID> asSet(Optional<UUID> id) {
        return id.map(Set::of).orElse(Set.of());
    }

    private static Set<UUID> without(Set<UUID> ids, UUID excluded) {
        Set<UUID> rest = new LinkedHashSet<>(ids);
        rest.remove(excluded);
        return rest;
    }

    private static String blankToNull(String text) {
        return text == null || text.isBlank() ? null : text.strip();
    }
}
