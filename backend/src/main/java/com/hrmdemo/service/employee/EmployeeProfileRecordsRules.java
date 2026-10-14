package com.hrmdemo.service.employee;

import java.time.LocalDate;

import com.hrmdemo.exception.ApiException;
import org.springframework.http.HttpStatus;

/** Field validation shared by HRM-08 bank account and dependent endpoints. */
public final class EmployeeProfileRecordsRules {
    private EmployeeProfileRecordsRules() {
    }

    public static String required(String value, String field, int maxLength) {
        if (value == null || value.isBlank() || value.strip().length() > maxLength) {
            throw badField(field);
        }
        return value.strip();
    }

    public static void dependentDates(LocalDate from, LocalDate to) {
        if (from == null || (to != null && to.isBefore(from))) {
            throw badField("effectiveFrom/effectiveTo");
        }
    }

    private static ApiException badField(String field) {
        return new ApiException(HttpStatus.BAD_REQUEST, "employee.invalid_field",
                "Invalid employee profile field: " + field).with("field", field);
    }
}
