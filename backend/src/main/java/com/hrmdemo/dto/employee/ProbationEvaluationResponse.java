package com.hrmdemo.dto.employee;

import com.hrmdemo.entity.employee.EmploymentContract;
import com.hrmdemo.entity.employee.EmployeeSalaryProfile;
import com.hrmdemo.entity.employee.ProbationEvaluation;
import java.time.LocalDate;
import java.util.UUID;

public record ProbationEvaluationResponse(UUID id, UUID sourceContractId, UUID evaluatorId,
        LocalDate startsOn, LocalDate endsOn, String outcome, String notes, UUID actorId,
        FormalContractSuggestion formalContractSuggestion) {
    public static ProbationEvaluationResponse from(ProbationEvaluation evaluation, EmploymentContract contract,
            EmployeeSalaryProfile salary) {
        return new ProbationEvaluationResponse(evaluation.getId(), evaluation.getSourceContractId(),
                evaluation.getEvaluatorId(), evaluation.getStartsOn(), evaluation.getEndsOn(),
                evaluation.getOutcome().name(), evaluation.getNotes(), evaluation.getActorId(),
                evaluation.getOutcome() == ProbationEvaluation.Outcome.PASS
                        && "PROBATION".equalsIgnoreCase(contract.getContractType())
                        ? FormalContractSuggestion.from(contract, salary) : null);
    }
}
