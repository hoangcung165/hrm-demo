package com.hrmdemo.service.approval;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.service.auth.AccountService;
import com.hrmdemo.service.employee.EmployeeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Approvers from the org structure and the Accounts: the Quản lý trực tiếp and the unit heads from the Employees and
 * units, the role holders from the unlocked Accounts linked to an active Employee. Projects come with HRM-15: until
 * then a project has no PM here, so a timesheet level escalates.
 */
@Component
@RequiredArgsConstructor
class OrgApproverDirectory implements ApproverDirectory {

    private final EmployeeService employees;
    private final AccountService accounts;

    @Override
    public Optional<UUID> lineManagerOf(UUID employeeId) {
        return employees.lineManagerId(employeeId);
    }

    @Override
    public Optional<UUID> parentUnitHeadOf(UUID employeeId) {
        return employees.parentUnitHeadId(employeeId);
    }

    @Override
    public Optional<UUID> projectManagerOf(UUID projectId) {
        return Optional.empty();
    }

    @Override
    public Set<UUID> employeesWithRole(Role role) {
        return employees.activeIds(accounts.employeeIdsWithRole(role));
    }
}
