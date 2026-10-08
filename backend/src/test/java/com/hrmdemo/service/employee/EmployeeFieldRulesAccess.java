package com.hrmdemo.service.employee;

import java.time.LocalDate;

import com.hrmdemo.dto.employee.EmployeeCreateRequest;

/** Lets tests of other packages run the field rules of a new Employee, which are package-private. */
public final class EmployeeFieldRulesAccess {

    private EmployeeFieldRulesAccess() {
    }

    /** True when the request passes; otherwise the rules' own {@code validation.invalid} exception is thrown. */
    public static boolean passes(EmployeeCreateRequest request, LocalDate today) {
        EmployeeFieldRules.check(request, today);
        return true;
    }
}
