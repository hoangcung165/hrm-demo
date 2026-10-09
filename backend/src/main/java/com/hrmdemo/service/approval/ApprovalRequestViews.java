package com.hrmdemo.service.approval;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.approval.ApprovalAllowedActions;
import com.hrmdemo.dto.approval.ApprovalLogEntryResponse;
import com.hrmdemo.dto.approval.ApprovalRequestResponse;
import com.hrmdemo.dto.approval.ApprovalStatus;
import com.hrmdemo.dto.approval.ApprovalStepResponse;
import com.hrmdemo.dto.approval.ApprovalStepState;
import com.hrmdemo.dto.employee.EmployeeCard;
import com.hrmdemo.entity.approval.ApprovalRequest;
import com.hrmdemo.entity.approval.ApprovalRequestLogEntry;
import com.hrmdemo.service.approval.ApprovalEvent.Type;
import com.hrmdemo.service.employee.EmployeeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Builds the detail of an approval request, naming every Employee in it in one load. */
@Component
@RequiredArgsConstructor
class ApprovalRequestViews {

    /** Log events that decide a level. */
    static final Set<String> DECISIONS = Set.of(Type.LEVEL_APPROVED.name(), Type.APPROVED.name(),
            Type.REJECTED.name(), Type.RETURNED.name());

    private final EmployeeService employees;

    ApprovalRequestResponse detail(ApprovalRequest request, ApprovalRequestState state,
            List<ApprovalRequestLogEntry> log, UUID me, Optional<ApprovalEngine.Acting> acting) {
        Set<UUID> ids = new HashSet<>(state.approvers());
        ids.add(request.getSenderId());
        for (ApprovalRequestLogEntry entry : log) {
            addIfPresent(ids, entry.getActorId());
            addIfPresent(ids, entry.getOnBehalfOfId());
        }
        acting.map(ApprovalEngine.Acting::onBehalfOf).ifPresent(ids::add);
        Map<UUID, EmployeeCard> cards = employees.cards(ids);

        List<ApprovalStepResponse> steps = new ArrayList<>();
        for (int level = 1; level <= state.flow().levelCount(); level++) {
            steps.add(step(state, level, log, cards));
        }
        List<ApprovalLogEntryResponse> lines = log.stream()
                .map(entry -> new ApprovalLogEntryResponse(entry.getEvent(), entry.getLevel(),
                        card(cards, entry.getActorId()), card(cards, entry.getOnBehalfOfId()), entry.getComment(),
                        entry.getEscalatedTo(), entry.getAt()))
                .toList();
        boolean sender = me.equals(request.getSenderId());
        ApprovalAllowedActions allowed = new ApprovalAllowedActions(acting.isPresent(),
                acting.map(a -> card(cards, a.onBehalfOf())).orElse(null),
                sender && state.status() == ApprovalStatus.RETURNED_FOR_INFO,
                sender && (state.status() == ApprovalStatus.PENDING
                        || state.status() == ApprovalStatus.RETURNED_FOR_INFO));
        return new ApprovalRequestResponse(request.getId(), state.type(), state.status(), state.level(),
                state.flow().levelCount(), request.getSummary(), card(cards, request.getSenderId()),
                request.getCreatedAt(), state.autoApproveDueAt().orElse(null), steps, lines, allowed);
    }

    private ApprovalStepResponse step(ApprovalRequestState state, int level, List<ApprovalRequestLogEntry> log,
            Map<UUID, EmployeeCard> cards) {
        ApprovalLevel rule = state.flow().level(level);
        Optional<ApprovalRequestLogEntry> decision = last(log, level, DECISIONS);
        boolean escalated = last(log, level, Set.of(Type.ESCALATED.name())).isPresent();
        boolean auto = decision.isPresent() && decision.get().getActorId() == null;
        ApprovalStepState stepState;
        if (level < state.level() || (level == state.level() && state.status() == ApprovalStatus.APPROVED)) {
            stepState = ApprovalStepState.DONE;
        } else if (level > state.level()) {
            stepState = ApprovalStepState.NOT_REACHED;
        } else {
            stepState = switch (state.status()) {
                case PENDING, DRAFT -> ApprovalStepState.WAITING;
                case RETURNED_FOR_INFO -> ApprovalStepState.RETURNED;
                case REJECTED -> ApprovalStepState.REJECTED;
                case CANCELLED -> ApprovalStepState.CANCELLED;
                case APPROVED -> ApprovalStepState.DONE;
            };
        }
        boolean decided = stepState != ApprovalStepState.WAITING && stepState != ApprovalStepState.NOT_REACHED
                && stepState != ApprovalStepState.CANCELLED;
        List<EmployeeCard> approvers = stepState == ApprovalStepState.WAITING
                ? state.approvers().stream().map(id -> card(cards, id)).filter(c -> c != null).toList()
                : List.of();
        return new ApprovalStepResponse(level, rule.rule(), rule.role() == null ? null : rule.role().name(),
                stepState, approvers, stepState == ApprovalStepState.WAITING ? state.escalated() : escalated,
                decided ? decision.map(d -> card(cards, d.getActorId())).orElse(null) : null,
                decided ? decision.map(d -> card(cards, d.getOnBehalfOfId())).orElse(null) : null,
                decided ? decision.map(ApprovalRequestLogEntry::getAt).orElse(null) : null,
                decided ? decision.map(ApprovalRequestLogEntry::getComment).orElse(null) : null,
                decided && auto);
    }

    private static Optional<ApprovalRequestLogEntry> last(List<ApprovalRequestLogEntry> log, int level,
            Set<String> events) {
        ApprovalRequestLogEntry found = null;
        for (ApprovalRequestLogEntry entry : log) {
            if (entry.getLevel() == level && events.contains(entry.getEvent())) {
                found = entry;
            }
        }
        return Optional.ofNullable(found);
    }

    private static EmployeeCard card(Map<UUID, EmployeeCard> cards, UUID id) {
        return id == null ? null : cards.get(id);
    }

    private static void addIfPresent(Set<UUID> ids, UUID id) {
        if (id != null) {
            ids.add(id);
        }
    }
}
