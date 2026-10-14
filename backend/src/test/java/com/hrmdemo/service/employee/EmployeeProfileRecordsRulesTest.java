package com.hrmdemo.service.employee;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.LocalDate;

import com.hrmdemo.exception.ApiException;
import org.junit.jupiter.api.Test;

class EmployeeProfileRecordsRulesTest {
    @Test
    void requiresNonEmptyTrimmedValues() {
        assertEquals("Vietcombank", EmployeeProfileRecordsRules.required(" Vietcombank ", "bankName", 150));
        assertThrows(ApiException.class, () -> EmployeeProfileRecordsRules.required(" ", "bankName", 150));
        assertThrows(ApiException.class, () -> EmployeeProfileRecordsRules.required("abcd", "name", 3));
    }

    @Test
    void dependentDatePeriodIsInclusiveAndCanBeOpenEnded() {
        LocalDate today = LocalDate.of(2026, 10, 14);
        EmployeeProfileRecordsRules.dependentDates(today, today);
        EmployeeProfileRecordsRules.dependentDates(today, null);
        assertThrows(ApiException.class, () -> EmployeeProfileRecordsRules.dependentDates(null, today));
        assertThrows(ApiException.class, () -> EmployeeProfileRecordsRules.dependentDates(today, today.minusDays(1)));
    }
}
