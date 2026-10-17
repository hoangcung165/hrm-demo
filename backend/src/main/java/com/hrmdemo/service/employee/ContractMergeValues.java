package com.hrmdemo.service.employee;

import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.EmploymentContract;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;

/**
 * The merge field values of an exported Hợp đồng lao động. A contract is a Vietnamese legal document, so the
 * values are written in Vietnamese whatever language the interface uses: dates as dd/MM/yyyy, money with a dot
 * between thousands and no decimals, yes/no as "Có"/"Không", and the contract type and tax method by name.
 * The web preview in {@code document-preview.ts} mirrors these rules.
 */
final class ContractMergeValues {
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private static final Map<String, String> CONTRACT_TYPES = Map.of(
            "PROBATION", "Hợp đồng thử việc",
            "FIXED_TERM", "Hợp đồng xác định thời hạn",
            "INDEFINITE", "Hợp đồng không xác định thời hạn",
            "EMPLOYMENT", "Hợp đồng lao động",
            "EMPLOYMENT_WITH_PROBATION", "Hợp đồng lao động có thử việc");
    private static final Map<String, String> TAX_METHODS = Map.of(
            "PROGRESSIVE", "Lũy tiến",
            "WITHHOLD_10", "Khấu trừ 10%");

    private ContractMergeValues() {
    }

    static Map<String, String> of(Employee employee, EmploymentContract contract) {
        return Map.ofEntries(
                Map.entry("employee_name", employee.getFullName()),
                Map.entry("employee_code", employee.getCode()),
                Map.entry("contract_number", contract.getContractNumber()),
                Map.entry("contract_type", CONTRACT_TYPES.getOrDefault(contract.getContractType(), contract.getContractType())),
                Map.entry("signed_on", date(contract.getSignedOn())),
                Map.entry("starts_on", date(contract.getStartsOn())),
                Map.entry("ends_on", date(contract.getEndsOn())),
                Map.entry("base_salary", money(contract.getBaseSalary())),
                Map.entry("insurance_salary", money(contract.getInsuranceSalary())),
                Map.entry("insured", contract.isInsured() ? "Có" : "Không"),
                Map.entry("tax_method", TAX_METHODS.getOrDefault(contract.getTaxMethod(), contract.getTaxMethod())));
    }

    static String date(LocalDate value) {
        return value == null ? "" : value.format(DATE);
    }

    /** 18000000.00 becomes "18.000.000"; no value stays empty. */
    static String money(BigDecimal value) {
        if (value == null) {
            return "";
        }
        // DecimalFormat is not thread-safe, so one per call; the separator is fixed rather than taken from locale data.
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.ROOT);
        symbols.setGroupingSeparator('.');
        return new DecimalFormat("#,##0", symbols).format(value.setScale(0, RoundingMode.HALF_UP));
    }
}
