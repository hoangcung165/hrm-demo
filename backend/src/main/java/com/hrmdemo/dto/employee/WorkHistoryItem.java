package com.hrmdemo.dto.employee;

import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.WorkDecision;
import com.hrmdemo.entity.employee.ProbationEvaluation;
import com.hrmdemo.entity.employee.Resignation;
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

    public static WorkHistoryItem probation(ProbationEvaluation evaluation) {
        return new WorkHistoryItem(evaluation.getId(), "PROBATION_" + evaluation.getOutcome().name(),
                null, null, evaluation.getEndsOn(), "Probation evaluated", null, null,
                null, null, evaluation.getActorId());
    }

    public static WorkHistoryItem resignation(Resignation resignation) {
        return new WorkHistoryItem(resignation.getId(), "RESIGNATION", null, null,
                resignation.getLastWorkingDay(), resignation.getReason(), null, null,
                null, null, resignation.getActorId());
    }
}
