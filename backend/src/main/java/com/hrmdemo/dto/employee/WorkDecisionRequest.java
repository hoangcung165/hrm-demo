package com.hrmdemo.dto.employee;

import java.time.LocalDate;
import java.util.UUID;

/** TRANSFER uses orgUnitId (null means company); PROMOTION uses positionId. */
public record WorkDecisionRequest(String decisionNumber, String kind, LocalDate signedOn,
        LocalDate effectiveOn, String description, UUID orgUnitId, UUID positionId) {
}
