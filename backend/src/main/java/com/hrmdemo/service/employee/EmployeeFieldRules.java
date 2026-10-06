package com.hrmdemo.service.employee;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import com.hrmdemo.dto.employee.EmergencyContact;
import com.hrmdemo.dto.employee.EmployeeCreateRequest;
import com.hrmdemo.dto.employee.EmployeeIdentityRequest;
import com.hrmdemo.dto.employee.EmployeeJobRequest;
import com.hrmdemo.dto.employee.EmployeePersonalRequest;
import com.hrmdemo.entity.employee.EmployeeIdentityFields;
import com.hrmdemo.entity.employee.EmployeeJobFields;
import com.hrmdemo.entity.employee.EmployeePersonalFields;
import com.hrmdemo.entity.employee.EmployeeStatus;
import com.hrmdemo.entity.employee.Gender;
import com.hrmdemo.exception.ApiException;
import org.springframework.http.HttpStatus;

/**
 * The field rules of an Employee: each field is checked and normalized on its own, and every failing field is
 * reported at once as {@code validation.invalid} with {@code errors: [{field, code}]}. The codes are
 * {@code required}, {@code too_long}, {@code invalid}, {@code out_of_range}, {@code under_age} and
 * {@code not_id_number}. References (unit, position, manager) and uniqueness are the service's.
 */
final class EmployeeFieldRules {

    static final int MAX_FULL_NAME = 150;
    static final int MAX_EMAIL = 254;
    static final int MAX_ADDRESS = 500;
    static final int MAX_CONTACT_NAME = 150;
    static final int MAX_RELATIONSHIP = 50;
    static final int MAX_ISSUE_PLACE = 150;
    static final int MAX_HIRE_DAYS_AHEAD = 365;
    /** Minimum working age of the Labour Code. */
    static final int MIN_WORKING_AGE = 15;
    static final LocalDate EARLIEST_BIRTH = LocalDate.of(1900, 1, 1);

    private static final Pattern WHITESPACE = Pattern.compile("[\\s\\p{Z}]+");
    private static final Pattern PHONE_SEPARATORS = Pattern.compile("[\\s\\p{Z}.\\-]");
    private static final Pattern PHONE = Pattern.compile("0[0-9]{9}");
    private static final Pattern INTERNATIONAL_PHONE = Pattern.compile("\\+84[0-9]{9}");
    private static final Pattern EMAIL = Pattern.compile("[^\\s@]+@[^\\s@]+\\.[^\\s@]+");
    private static final Pattern ID_NUMBER = Pattern.compile("[0-9]{12}");
    private static final Pattern TEN_OR_TWELVE_DIGITS = Pattern.compile("[0-9]{10}|[0-9]{12}");

    private static final EmployeePersonalRequest NO_PERSONAL =
            new EmployeePersonalRequest(null, null, null, null, null, null);
    private static final EmployeeIdentityRequest NO_IDENTITY = new EmployeeIdentityRequest(null, null, null, null, null);
    private static final EmployeeJobRequest NO_JOB = new EmployeeJobRequest(null, null, null, null, null);

    /** The checked fields of a new Employee. */
    record Checked(EmployeePersonalFields personal, EmployeeIdentityFields identity, EmployeeJobFields job) {
    }

    private EmployeeFieldRules() {
    }

    /**
     * @param today the current date ({@code Clock})
     * @throws ApiException {@code validation.invalid} listing every failing field
     */
    static Checked check(EmployeeCreateRequest request, LocalDate today) {
        Errors errors = new Errors();
        EmployeePersonalRequest personal = request.personal() == null ? NO_PERSONAL : request.personal();
        EmployeeIdentityRequest identity = request.identity() == null ? NO_IDENTITY : request.identity();
        EmployeeJobRequest job = request.job() == null ? NO_JOB : request.job();

        String fullName = collapse(request.fullName());
        if (fullName == null) {
            errors.add("fullName", "required");
        } else if (fullName.length() > MAX_FULL_NAME) {
            errors.add("fullName", "too_long");
        }

        LocalDate hireDate = job.hireDate();
        if (hireDate == null) {
            errors.add("job.hireDate", "required");
        } else if (hireDate.isAfter(today.plusDays(MAX_HIRE_DAYS_AHEAD))) {
            errors.add("job.hireDate", "out_of_range");
        }
        LocalDate dateOfBirth = dateOfBirth(personal.dateOfBirth(), hireDate, today, errors);

        EmployeePersonalFields personalFields = new EmployeePersonalFields(fullName, dateOfBirth,
                gender(personal.gender(), errors), email(personal.personalEmail(), errors),
                phone(personal.phone(), "personal.phone", errors),
                limited(personal.address(), MAX_ADDRESS, "personal.address", errors),
                contactName(personal.emergencyContact(), errors), contactRelationship(personal.emergencyContact(), errors),
                contactPhone(personal.emergencyContact(), errors));

        EmployeeIdentityFields identityFields = identity(identity, dateOfBirth, today, errors);

        if (job.positionId() == null) {
            errors.add("job.positionId", "required");
        }
        EmployeeJobFields jobFields = new EmployeeJobFields(job.orgUnitId(), job.positionId(), job.managerId(),
                hireDate, newStatus(job.status(), errors));

        errors.throwIfAny();
        return new Checked(personalFields, identityFields, jobFields);
    }

    /** Null when missing or failing; the error is recorded. */
    private static LocalDate dateOfBirth(LocalDate value, LocalDate hireDate, LocalDate today, Errors errors) {
        if (value == null) {
            errors.add("personal.dateOfBirth", "required");
            return null;
        }
        if (!value.isAfter(EARLIEST_BIRTH) || !value.isBefore(today)) {
            errors.add("personal.dateOfBirth", "out_of_range");
            return null;
        }
        if (hireDate != null && value.plusYears(MIN_WORKING_AGE).isAfter(hireDate)) {
            errors.add("personal.dateOfBirth", "under_age");
            return null;
        }
        return value;
    }

    private static Gender gender(String value, Errors errors) {
        String trimmed = text(value);
        if (trimmed == null) {
            errors.add("personal.gender", "required");
            return null;
        }
        for (Gender gender : Gender.values()) {
            if (gender.name().equals(trimmed)) {
                return gender;
            }
        }
        errors.add("personal.gender", "invalid");
        return null;
    }

    private static String email(String value, Errors errors) {
        String trimmed = text(value);
        if (trimmed == null) {
            return null;
        }
        String lower = trimmed.toLowerCase(Locale.ROOT);
        if (lower.length() > MAX_EMAIL || !EMAIL.matcher(lower).matches()) {
            errors.add("personal.personalEmail", "invalid");
            return null;
        }
        return lower;
    }

    /** {@code 0xxxxxxxxx} with 10 digits; {@code +84xxxxxxxxx} is stored with a leading 0 instead. */
    static String phone(String value, String field, Errors errors) {
        String trimmed = text(value);
        if (trimmed == null) {
            return null;
        }
        String compact = PHONE_SEPARATORS.matcher(trimmed).replaceAll("");
        if (INTERNATIONAL_PHONE.matcher(compact).matches()) {
            compact = "0" + compact.substring(3);
        }
        if (!PHONE.matcher(compact).matches()) {
            errors.add(field, "invalid");
            return null;
        }
        return compact;
    }

    private static String contactName(EmergencyContact contact, Errors errors) {
        return contact == null ? null
                : limited(collapse(contact.name()), MAX_CONTACT_NAME, "personal.emergencyContact.name", errors);
    }

    private static String contactRelationship(EmergencyContact contact, Errors errors) {
        return contact == null ? null
                : limited(collapse(contact.relationship()), MAX_RELATIONSHIP, "personal.emergencyContact.relationship",
                        errors);
    }

    private static String contactPhone(EmergencyContact contact, Errors errors) {
        return contact == null ? null : phone(contact.phone(), "personal.emergencyContact.phone", errors);
    }

    private static EmployeeIdentityFields identity(EmployeeIdentityRequest identity, LocalDate dateOfBirth,
            LocalDate today, Errors errors) {
        String idNumber = digits(identity.idNumber());
        if (idNumber == null) {
            errors.add("identity.idNumber", "required");
        } else if (!ID_NUMBER.matcher(idNumber).matches()) {
            errors.add("identity.idNumber", "invalid");
            idNumber = null;
        }

        LocalDate issueDate = identity.idIssueDate();
        if (issueDate != null && (issueDate.isAfter(today) || (dateOfBirth != null && issueDate.isBefore(dateOfBirth)))) {
            errors.add("identity.idIssueDate", "out_of_range");
        }
        String issuePlace = limited(collapse(identity.idIssuePlace()), MAX_ISSUE_PLACE, "identity.idIssuePlace", errors);

        String taxCode = numberOrIdNumber(identity.taxCode(), idNumber, "identity.taxCode", errors);
        String socialInsuranceNumber = numberOrIdNumber(identity.socialInsuranceNumber(), idNumber,
                "identity.socialInsuranceNumber", errors);
        return new EmployeeIdentityFields(idNumber, issueDate, issuePlace, taxCode, socialInsuranceNumber);
    }

    /**
     * MST and số BHXH: 10 digits (codes issued before 07/2025), or 12 digits that must be the CCCD (the personal
     * identification number has been the code since 01/07/2025).
     */
    static String numberOrIdNumber(String value, String idNumber, String field, Errors errors) {
        String number = digits(value);
        if (number == null) {
            return null;
        }
        if (!TEN_OR_TWELVE_DIGITS.matcher(number).matches()) {
            errors.add(field, "invalid");
            return null;
        }
        // Compared only with a valid CCCD; a missing or bad CCCD has its own error.
        if (number.length() == 12 && idNumber != null && !number.equals(idNumber)) {
            errors.add(field, "not_id_number");
            return null;
        }
        return number;
    }

    /** A new Employee starts on probation unless the request says official; Inactive is never set here. */
    private static EmployeeStatus newStatus(String value, Errors errors) {
        String trimmed = text(value);
        if (trimmed == null) {
            return EmployeeStatus.PROBATION;
        }
        if (EmployeeStatus.PROBATION.name().equals(trimmed)) {
            return EmployeeStatus.PROBATION;
        }
        if (EmployeeStatus.OFFICIAL.name().equals(trimmed)) {
            return EmployeeStatus.OFFICIAL;
        }
        errors.add("job.status", "invalid");
        return null;
    }

    private static String limited(String value, int max, String field, Errors errors) {
        String trimmed = text(value);
        if (trimmed != null && trimmed.length() > max) {
            errors.add(field, "too_long");
            return null;
        }
        return trimmed;
    }

    /** Trimmed; null when null or blank. */
    private static String text(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.strip();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /** Trimmed with inner runs of whitespace as one space; null when null or blank. */
    private static String collapse(String value) {
        String trimmed = text(value);
        return trimmed == null ? null : WHITESPACE.matcher(trimmed).replaceAll(" ");
    }

    /** A number as typed, without the spaces people put between groups of digits; null when blank. */
    private static String digits(String value) {
        String trimmed = text(value);
        return trimmed == null ? null : WHITESPACE.matcher(trimmed).replaceAll("");
    }

    /** The failing fields, the first error of each. */
    static final class Errors {

        private final Set<String> fields = new LinkedHashSet<>();
        private final List<Map<String, String>> errors = new ArrayList<>();

        void add(String field, String code) {
            if (fields.add(field)) {
                errors.add(Map.of("field", field, "code", code));
            }
        }

        void throwIfAny() {
            if (!errors.isEmpty()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "validation.invalid",
                        "Request value is invalid: " + String.join(", ", fields))
                        .with("errors", List.copyOf(errors));
            }
        }
    }
}
