package com.hrmdemo.entity.employee;

import java.time.LocalDate;

/**
 * The identity numbers of an {@link Employee} (Trường nhạy cảm), already checked by the service.
 *
 * @param idNumber              CCCD, 12 digits
 * @param taxCode               MST: 10 digits, or 12 digits equal to the CCCD; null when unknown
 * @param socialInsuranceNumber số BHXH: 10 digits, or 12 digits equal to the CCCD; null when unknown
 */
public record EmployeeIdentityFields(String idNumber, LocalDate idIssueDate, String idIssuePlace, String taxCode,
        String socialInsuranceNumber) {
}
