package com.hrmdemo.service.employee;

import com.hrmdemo.dto.employee.EmploymentContractRequest;
import com.hrmdemo.exception.ApiException;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class EmploymentContractValidationTest {
    private EmploymentContractRequest request(LocalDate from, LocalDate to, BigDecimal salary) {
        return new EmploymentContractRequest("HD-2026/0001", "FIXED_TERM",
                LocalDate.of(2026, 10, 1), from, to, salary, salary,
                "[]", true, "PROGRESSIVE");
    }

    @Test
    void validOpenEndedAndFiniteContracts() {
        assertDoesNotThrow(() -> EmploymentContractService.validate(
                request(LocalDate.of(2026, 10, 1), null, BigDecimal.ZERO)));
        assertDoesNotThrow(() -> EmploymentContractService.validate(
                request(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 1),
                        new BigDecimal("18000000"))));
    }

    @Test
    void rejectsEndBeforeStart() {
        ApiException ex = assertThrows(ApiException.class, () -> EmploymentContractService.validate(
                request(LocalDate.of(2026, 10, 16), LocalDate.of(2026, 10, 15),
                        new BigDecimal("18000000"))));
        assertEquals("contract.invalid_fields", ex.getCode());
    }

    @Test
    void rejectsNegativePayAndMissingRequiredFields() {
        assertThrows(ApiException.class, () -> EmploymentContractService.validate(
                request(LocalDate.of(2026, 10, 1), null, new BigDecimal("-1"))));
        assertThrows(ApiException.class, () -> EmploymentContractService.validate(
                new EmploymentContractRequest("", "FIXED_TERM",
                        LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 1),
                        null, BigDecimal.ONE, null, "[]", true, "PROGRESSIVE")));
    }

    @Test
    void rejectsNullPayload() {
        assertThrows(ApiException.class, () -> EmploymentContractService.validate(null));
    }
}
