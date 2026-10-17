package com.hrmdemo.dto.employee;

import java.time.LocalDate;
import java.util.UUID;

public record ProbationEvaluationRequest(UUID sourceContractId, UUID evaluatorId, LocalDate startsOn,
        LocalDate endsOn, String outcome, String notes) {
}
