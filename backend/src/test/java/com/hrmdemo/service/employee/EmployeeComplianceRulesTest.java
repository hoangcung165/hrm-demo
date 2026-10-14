package com.hrmdemo.service.employee;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.LocalDate;

import com.hrmdemo.entity.employee.EmployeeExpatDocument;
import com.hrmdemo.exception.ApiException;
import org.junit.jupiter.api.Test;

class EmployeeComplianceRulesTest {
    @Test
    void countryCodesNormalizeAndRejectInvalid() {
        assertThat(EmployeeComplianceRules.nationality(" vn ")).isEqualTo("VN");
        assertThat(EmployeeComplianceRules.nationality(null)).isNull();
        assertThrows(ApiException.class, () -> EmployeeComplianceRules.country("AUS", "nationality"));
    }

    @Test
    void documentExpiryCannotPrecedeIssue() {
        LocalDate issued = LocalDate.of(2026, 1, 1);
        EmployeeComplianceRules.dates(issued, issued);
        EmployeeComplianceRules.dates(null, issued);
        assertThrows(ApiException.class, () -> EmployeeComplianceRules.dates(issued, issued.minusDays(1)));
        assertThrows(ApiException.class, () -> EmployeeComplianceRules.dates(issued, null));
        assertThat(EmployeeComplianceRules.documentNumber(" wp123456 ")).isEqualTo("WP123456");
        assertThat(EmployeeComplianceRules.type("VISA")).isEqualTo(EmployeeExpatDocument.Type.VISA);
        assertThrows(ApiException.class, () -> EmployeeComplianceRules.type("OTHER"));
    }
}
