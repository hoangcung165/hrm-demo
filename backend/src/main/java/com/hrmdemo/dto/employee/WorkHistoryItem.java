package com.hrmdemo.dto.employee;

import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.WorkDecision;
import java.time.LocalDate;
import java.util.UUID;

public record WorkHistoryItem(UUID sourceId, String kind, String decisionNumber, LocalDate signedOn,
        LocalDate effectiveOn, String description, UUID previousOrgUnitId, UUID orgUnitId,
        UUID previousPositionId, UUID positionId, UUID actorId) {
    public static WorkHistoryItem hire(Employee employee) {
        return new WorkHistoryItem(null, "HIRE", null, null, employee.getHireDate(), "Hired",
                null, employee.getOrgUnitId(), null, employee.getPositionId(), null);
    }

    public static WorkHistoryItem decision(WorkDecision decision) {
        return new WorkHistoryItem(decision.getId(), decision.getKind().name(), decision.getDecisionNumber(),
                decision.getSignedOn(), decision.getEffectiveOn(), decision.getDescription(),
                decision.getPreviousOrgUnitId(), decision.getOrgUnitId(), decision.getPreviousPositionId(),
                decision.getPositionId(), decision.getActorId());
    }
}
