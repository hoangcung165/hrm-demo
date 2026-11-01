package com.hrmdemo.dto.employee;

import java.time.LocalDate;
import java.util.UUID;

/** One row of the company-wide contract list. Terms only: no salary, insurance or allowance data. */
public record ContractListItem(UUID id, UUID employeeId, String employeeCode, String employeeName,
        String contractNumber, String contractType, LocalDate startsOn, LocalDate endsOn,
        ContractState state, Integer daysRemaining) {}
