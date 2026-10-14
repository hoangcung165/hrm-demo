package com.hrmdemo.service.employee;

import java.time.LocalDate;
import java.util.Locale;
import java.util.regex.Pattern;

import com.hrmdemo.entity.employee.EmployeeExpatDocument;
import com.hrmdemo.exception.ApiException;
import org.springframework.http.HttpStatus;

/** Input rules for insurance details, nationality and expat document metadata. */
public final class EmployeeComplianceRules {
    private static final Pattern COUNTRY = Pattern.compile("[A-Z]{2}");
    private static final Pattern DOCUMENT_NUMBER = Pattern.compile("[A-Z0-9-]{3,40}");
    private EmployeeComplianceRules() {}

    public static String nationality(String value) {
        if (value == null || value.isBlank()) return null;
        return country(value, "nationality");
    }

    public static String country(String value, String field) {
        String normalized = value == null ? "" : value.strip().toUpperCase(Locale.ROOT);
        if (!COUNTRY.matcher(normalized).matches()) throw invalid(field);
        return normalized;
    }

    public static String optionalText(String value, String field, int limit) {
        if (value == null || value.isBlank()) return null;
        if (value.strip().length() > limit) throw invalid(field);
        return value.strip();
    }

    public static String documentNumber(String value) {
        String normalized = value == null ? "" : value.strip().toUpperCase(Locale.ROOT);
        if (!DOCUMENT_NUMBER.matcher(normalized).matches()) throw invalid("documentNumber");
        return normalized;
    }

    public static EmployeeExpatDocument.Type type(String value) {
        try {
            return EmployeeExpatDocument.Type.valueOf(value);
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw invalid("documentType");
        }
    }

    public static void dates(LocalDate issuedAt, LocalDate expiresAt) {
        if (expiresAt == null || (issuedAt != null && expiresAt.isBefore(issuedAt))) {
            throw invalid("expiresAt");
        }
    }

    public static ApiException invalid(String field) {
        return new ApiException(HttpStatus.BAD_REQUEST, "employee.invalid_field", "Invalid field: " + field)
                .with("field", field);
    }
}
