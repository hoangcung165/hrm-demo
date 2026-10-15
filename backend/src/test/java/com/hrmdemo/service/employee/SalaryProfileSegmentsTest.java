package com.hrmdemo.service.employee;

import com.hrmdemo.dto.employee.SalaryProfileSegment;
import com.hrmdemo.entity.employee.EmployeeSalaryProfile;
import com.hrmdemo.exception.ApiException;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class SalaryProfileSegmentsTest {
    private final UUID employee = UUID.randomUUID();
    private final UUID contract = UUID.randomUUID();

    private EmployeeSalaryProfile profile(int start, int salary, UUID amendmentId) {
        return new EmployeeSalaryProfile(employee, contract, amendmentId,
                LocalDate.of(2026, 10, start), LocalDate.of(2026, 11, 30),
                BigDecimal.valueOf(salary), BigDecimal.valueOf(salary),
                "[]",true,"PROGRESSIVE",null,Instant.parse("2026-10-01T00:00:00Z"));
    }

    @Test
    void amendmentOnSixteenthSplitsOctoberIntoTwoInclusiveSegments() {
        UUID amendment = UUID.randomUUID();
        List<SalaryProfileSegment> rows = SalaryProfileService.segments(
                List.of(profile(1, 18000000, null), profile(16, 21000000, amendment)),
                LocalDate.of(2026,10,1), LocalDate.of(2026,10,31));
        assertEquals(2, rows.size());
        assertEquals(LocalDate.of(2026,10,1),rows.get(0).from());
        assertEquals(LocalDate.of(2026,10,15),rows.get(0).to());
        assertEquals(BigDecimal.valueOf(18000000),rows.get(0).baseSalary());
        assertEquals(LocalDate.of(2026,10,16),rows.get(1).from());
        assertEquals(LocalDate.of(2026,10,31),rows.get(1).to());
        assertEquals(BigDecimal.valueOf(21000000),rows.get(1).baseSalary());
        assertEquals(amendment,rows.get(1).sourceAmendmentId());
    }

    @Test
    void clipsToRequestedPeriodAndContractEnd() {
        List<SalaryProfileSegment> rows = SalaryProfileService.segments(
                List.of(profile(1, 18000000, null)),
                LocalDate.of(2026,11,20),LocalDate.of(2026,12,31));
        assertEquals(1,rows.size());
        assertEquals(LocalDate.of(2026,11,20),rows.get(0).from());
        assertEquals(LocalDate.of(2026,11,30),rows.get(0).to());
    }

    @Test
    void gapsReturnNoInventedSalary() {
        assertTrue(SalaryProfileService.segments(List.of(),
                LocalDate.of(2026,10,1),LocalDate.of(2026,10,31)).isEmpty());
    }

    @Test
    void reverseRangeIsRejected() {
        assertThrows(ApiException.class, () -> SalaryProfileService.segments(List.of(),
                LocalDate.of(2026,10,31),LocalDate.of(2026,10,1)));
    }
}
