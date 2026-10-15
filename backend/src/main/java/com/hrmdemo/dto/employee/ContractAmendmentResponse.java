package com.hrmdemo.dto.employee;

import com.hrmdemo.entity.employee.ContractAmendment;
import java.time.LocalDate;
import java.util.UUID;

public record ContractAmendmentResponse(UUID id, UUID contractId, String amendmentNumber,
        LocalDate signedOn, LocalDate effectiveOn, String description) {
    public static ContractAmendmentResponse from(ContractAmendment value) {
        return new ContractAmendmentResponse(value.getId(), value.getContractId(),
                value.getAmendmentNumber(), value.getSignedOn(), value.getEffectiveOn(),
                value.getDescription());
    }
}
