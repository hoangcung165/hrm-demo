package com.hrmdemo.dto.employee;

import java.time.LocalDate;
import java.util.UUID;

/** Source references and expiry metadata only: no identity numbers, salaries or private file URLs. */
public record UpcomingExpiryItem(ExpiryType type, UUID sourceId, UUID employeeId, String employeeCode,
        String employeeName, String sourceName, LocalDate expiresOn, int daysRemaining, String sourcePath) {}
