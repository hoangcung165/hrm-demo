package com.hrmdemo.service.approval;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import com.hrmdemo.dto.approval.ApprovalRequestResponse;
import com.hrmdemo.dto.approval.ApprovalRequestType;
import com.hrmdemo.dto.approval.ApprovalStatus;
import com.hrmdemo.dto.approval.ApproverRule;
import com.hrmdemo.entity.approval.ApprovalFlowSetting;
import com.hrmdemo.entity.approval.ApprovalRequest;
import com.hrmdemo.entity.approval.ApprovalRequestLogEntry;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.approval.ApprovalRequestLogRepository;
import com.hrmdemo.repository.approval.ApprovalRequestRepository;
import com.hrmdemo.security.CurrentAccount;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Yêu cầu phê duyệt kept between actions: sending (by the feature of the request type), the five actions and the
 * detail. The rules are {@link ApprovalEngine}'s; this service loads and stores its state, writes the Nhật ký and
 * publishes every {@link ApprovalEvent} for the listeners (notifications, the type's own effect).
 * <p>
 * Approvers act as Employees: an Account without an Employee cannot send or decide.
 */
@Service
public class ApprovalRequestService {

    static final ZoneId COMPANY_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final ApprovalRequestRepository requests;
    private final ApprovalRequestLogRepository logs;
    private final ApprovalFlowService flows;
    private final ApprovalRequestViews views;
    private final ApplicationEventPublisher events;
    private final ApprovalEngine engine;
    private final Clock clock;

    public ApprovalRequestService(ApprovalRequestRepository requests, ApprovalRequestLogRepository logs,
            ApprovalFlowService flows, ApprovalRequestViews views, ApplicationEventPublisher events,
            ApproverDirectory directory, ObjectProvider<ApprovalDelegations> delegations, Clock clock) {
        this.requests = requests;
        this.logs = logs;
        this.flows = flows;
        this.views = views;
        this.events = events;
        this.engine = new ApprovalEngine(directory, delegations.getIfAvailable(() -> ApprovalDelegations.NONE),
                COMPANY_ZONE);
        this.clock = clock;
    }

    ApprovalEngine engine() {
        return engine;
    }

    /**
     * Sends a new request with the flow in force for its type. Called by the feature of the type once it has checked
     * the caller; returns the request's id.
     *
     * @param summary one line for lists and notifications, e.g. "Số điện thoại, địa chỉ"
     */
    @Transactional
    public UUID submit(UUID senderEmployeeId, ApprovalRequestType type, UUID projectId, String summary) {
        Instant now = clock.instant();
        ApprovalFlow flow = flows.flowOf(type);
        ApprovalTransition transition = engine.submit(UUID.randomUUID(), flow, senderEmployeeId, projectId, now);
        List<ApprovalFlowSetting.Level> levels = flow.levels().stream()
                .map(level -> new ApprovalFlowSetting.Level(level.rule().name(),
                        level.role() == null ? null : level.role().name()))
                .toList();
        ApprovalRequest request = new ApprovalRequest(transition.state().id(), type.name(), senderEmployeeId,
                projectId, summary, levels, flow.autoApproveDays(), flow.delegationAllowed(), now);
        store(request, transition, now);
        return request.getId();
    }

    @Transactional(readOnly = true)
    public ApprovalRequestResponse get(CurrentAccount caller, UUID id) {
        UUID me = requireEmployee(caller);
        ApprovalRequest request = find(id);
        ApprovalRequestState state = stateOf(request);
        List<ApprovalRequestLogEntry> log = logs.findByRequestIdOrderBySeq(id);
        Optional<ApprovalEngine.Acting> acting = engine.actingAs(state, me, clock.instant());
        boolean involved = me.equals(request.getSenderId()) || acting.isPresent()
                || log.stream().anyMatch(entry -> me.equals(entry.getActorId()) || me.equals(entry.getOnBehalfOfId()));
        if (!involved) {
            throw notFound();
        }
        return views.detail(request, state, log, me, acting);
    }

    @Transactional
    public ApprovalRequestResponse approve(CurrentAccount caller, UUID id, String note) {
        return act(caller, id, (state, me, now) -> engine.approve(state, me, note, now));
    }

    @Transactional
    public ApprovalRequestResponse reject(CurrentAccount caller, UUID id, String reason) {
        return act(caller, id, (state, me, now) -> engine.reject(state, me, reason, now));
    }

    @Transactional
    public ApprovalRequestResponse returnForInfo(CurrentAccount caller, UUID id, String reason) {
        return act(caller, id, (state, me, now) -> engine.returnForInfo(state, me, reason, now));
    }

    @Transactional
    public ApprovalRequestResponse resubmit(CurrentAccount caller, UUID id, String note) {
        return act(caller, id, (state, me, now) -> engine.resubmit(state, me, note, now));
    }

    @Transactional
    public ApprovalRequestResponse cancel(CurrentAccount caller, UUID id) {
        return act(caller, id, (state, me, now) -> engine.cancel(state, me, now));
    }

    /** Runs the auto-approve of one request if it is due; the background job (HRM-12/BE-6) calls this. */
    @Transactional
    public boolean autoApproveIfDue(UUID id) {
        Instant now = clock.instant();
        ApprovalRequest request = find(id);
        Optional<ApprovalTransition> transition = engine.autoApprove(stateOf(request), now);
        transition.ifPresent(t -> store(request, t, now));
        return transition.isPresent();
    }

    /**
     * What notifications and emails need of a request: its sender, its summary and when it was resubmitted. Joins the
     * caller's transaction, so a listener running before the commit sees the change it is about.
     *
     * @param resubmittedAt when the sender sent it again after a return, oldest first
     */
    public record Summary(UUID id, ApprovalRequestType type, UUID senderId, String summary,
            Set<Instant> resubmittedAt) {

        /** Compared to the microsecond, the precision PostgreSQL keeps. */
        public boolean resubmittedAt(Instant at) {
            Instant micros = at.truncatedTo(ChronoUnit.MICROS);
            return resubmittedAt.stream().anyMatch(time -> time.truncatedTo(ChronoUnit.MICROS).equals(micros));
        }
    }

    @Transactional(readOnly = true)
    public Summary summary(UUID id) {
        ApprovalRequest request = find(id);
        Set<Instant> resubmitted = logs.findByRequestIdOrderBySeq(id).stream()
                .filter(entry -> ApprovalEvent.Type.RESUBMITTED.name().equals(entry.getEvent()))
                .map(ApprovalRequestLogEntry::getAt)
                .collect(Collectors.toSet());
        return new Summary(id, ApprovalRequestType.valueOf(request.getRequestType()), request.getSenderId(),
                request.getSummary(), resubmitted);
    }

    private interface Action {
        ApprovalTransition run(ApprovalRequestState state, UUID me, Instant now);
    }

    private ApprovalRequestResponse act(CurrentAccount caller, UUID id, Action action) {
        UUID me = requireEmployee(caller);
        Instant now = clock.instant();
        ApprovalRequest request = find(id);
        ApprovalRequestState before = stateOf(request);
        boolean involved = me.equals(request.getSenderId()) || engine.actingAs(before, me, now).isPresent()
                || before.status() != ApprovalStatus.PENDING;
        if (!involved && !hasActed(id, me)) {
            // Not theirs to see: the same answer as for a request that does not exist.
            throw notFound();
        }
        ApprovalTransition transition = action.run(before, me, now);
        store(request, transition, now);
        ApprovalRequestState after = transition.state();
        return views.detail(request, after, logs.findByRequestIdOrderBySeq(id), me,
                engine.actingAs(after, me, now));
    }

    private void store(ApprovalRequest request, ApprovalTransition transition, Instant now) {
        ApprovalRequestState state = transition.state();
        request.apply(state.status().name(), state.level(), state.approvers(), state.escalated(),
                state.levelReachedAt(), state.waitedBeforeReturn().toSeconds(),
                state.autoApproveDueAt().orElse(null), now);
        try {
            requests.saveAndFlush(request);
        } catch (ObjectOptimisticLockingFailureException e) {
            throw new ApiException(HttpStatus.CONFLICT, "approval.already_handled",
                    "Someone acted on the request at the same time");
        }
        int seq = (int) logs.countByRequestId(request.getId());
        for (ApprovalEvent event : transition.events()) {
            logs.save(new ApprovalRequestLogEntry(request.getId(), event.type().name(), event.level(),
                    event.actorId(), event.onBehalfOf(), event.comment(),
                    event.escalatedTo() == null ? null : event.escalatedTo().name(), event.at(), ++seq));
            events.publishEvent(event);
        }
    }

    private boolean hasActed(UUID requestId, UUID me) {
        return logs.findByRequestIdOrderBySeq(requestId).stream()
                .anyMatch(entry -> me.equals(entry.getActorId()) || me.equals(entry.getOnBehalfOfId()));
    }

    private ApprovalRequest find(UUID id) {
        return requests.findById(id).orElseThrow(ApprovalRequestService::notFound);
    }

    /** The engine's state of a stored request, with the copy of the flow it was sent with. */
    static ApprovalRequestState stateOf(ApprovalRequest request) {
        ApprovalRequestType type = ApprovalRequestType.valueOf(request.getRequestType());
        List<ApprovalLevel> levels = request.getLevels().stream()
                .map(level -> new ApprovalLevel(ApproverRule.valueOf(level.getRule()),
                        level.getRole() == null ? null : Role.valueOf(level.getRole())))
                .toList();
        ApprovalFlow flow = new ApprovalFlow(type, levels, request.getAutoApproveDays(),
                request.isDelegationAllowed());
        return new ApprovalRequestState(request.getId(), flow, request.getSenderId(), request.getProjectId(),
                ApprovalStatus.valueOf(request.getStatus()), request.getLevel(), request.getApprovers(),
                request.isEscalated(), request.getLevelReachedAt(), Duration.ofSeconds(request.getWaitedSeconds()));
    }

    static UUID requireEmployee(CurrentAccount caller) {
        if (caller.employeeId() == null) {
            throw new ApiException(HttpStatus.FORBIDDEN, "approval.no_employee",
                    "Only an Account linked to an Employee sends or decides approval requests");
        }
        return caller.employeeId();
    }

    static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "approval.not_found", "No such approval request");
    }
}
