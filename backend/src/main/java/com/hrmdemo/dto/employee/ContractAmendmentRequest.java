package com.hrmdemo.dto.employee;

import java.time.LocalDate;

public record ContractAmendmentRequest(String amendmentNumber, LocalDate signedOn,
        LocalDate effectiveOn, String description) {
}
