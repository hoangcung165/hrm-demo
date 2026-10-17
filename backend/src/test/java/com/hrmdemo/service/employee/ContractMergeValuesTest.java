package com.hrmdemo.service.employee;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.EmploymentContract;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ContractMergeValuesTest {
    @Test
    void writesMoneyWithDotsAndNoDecimals() {
        assertEquals("18.000.000", ContractMergeValues.money(new BigDecimal("18000000.00")));
        assertEquals("850.000", ContractMergeValues.money(new BigDecimal("850000")));
        assertEquals("0", ContractMergeValues.money(BigDecimal.ZERO));
        assertEquals("1.234.568", ContractMergeValues.money(new BigDecimal("1234567.5")));
        assertEquals("", ContractMergeValues.money(null));
    }

    @Test
    void writesVietnameseValuesForAContract() {
        Employee employee = mock(Employee.class);
        when(employee.getFullName()).thenReturn("Nguyễn Văn An");
        when(employee.getCode()).thenReturn("NV00021");
        EmploymentContract contract = mock(EmploymentContract.class);
        when(contract.getContractNumber()).thenReturn("HD-2026/42");
        when(contract.getContractType()).thenReturn("EMPLOYMENT_WITH_PROBATION");
        when(contract.getSignedOn()).thenReturn(LocalDate.of(2026, 9, 1));
        when(contract.getStartsOn()).thenReturn(LocalDate.of(2026, 10, 1));
        when(contract.getEndsOn()).thenReturn(null);
        when(contract.getBaseSalary()).thenReturn(new BigDecimal("21000000.00"));
        when(contract.getInsuranceSalary()).thenReturn(null);
        when(contract.isInsured()).thenReturn(false);
        when(contract.getTaxMethod()).thenReturn("WITHHOLD_10");

        Map<String, String> values = ContractMergeValues.of(employee, contract);

        assertEquals("Nguyễn Văn An", values.get("employee_name"));
        assertEquals("Hợp đồng lao động có thử việc", values.get("contract_type"));
        assertEquals("01/09/2026", values.get("signed_on"));
        assertEquals("01/10/2026", values.get("starts_on"));
        assertEquals("", values.get("ends_on"));
        assertEquals("21.000.000", values.get("base_salary"));
        assertEquals("", values.get("insurance_salary"));
        assertEquals("Không", values.get("insured"));
        assertEquals("Khấu trừ 10%", values.get("tax_method"));
    }

    @Test
    void keepsAnUnknownContractTypeAsStored() {
        Employee employee = mock(Employee.class);
        when(employee.getFullName()).thenReturn("A");
        when(employee.getCode()).thenReturn("NV1");
        EmploymentContract contract = mock(EmploymentContract.class);
        when(contract.getContractNumber()).thenReturn("HD-1");
        when(contract.getContractType()).thenReturn("SEASONAL");
        when(contract.getSignedOn()).thenReturn(LocalDate.of(2026, 1, 1));
        when(contract.getStartsOn()).thenReturn(LocalDate.of(2026, 1, 1));
        when(contract.getBaseSalary()).thenReturn(BigDecimal.ONE);
        when(contract.getTaxMethod()).thenReturn("OTHER");

        Map<String, String> values = ContractMergeValues.of(employee, contract);

        assertEquals("SEASONAL", values.get("contract_type"));
        assertEquals("OTHER", values.get("tax_method"));
    }
}
