package com.hrmdemo.service.approval;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.service.auth.AccountService;
import com.hrmdemo.service.employee.EmployeeService;
import com.hrmdemo.service.project.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Approvers from the org structure and the Accounts: the Quản lý trực tiếp and the unit heads from the Employees and
 * units, the PM from the Dự án (HRM-15), the role holders from the unlocked Accounts linked to an active Employee.
 * A PM who has left counts as nobody, so a timesheet level escalates.
 */
@Component
@RequiredArgsConstructor
class OrgApproverDirectory implements ApproverDirectory {

    private final EmployeeService employees;
    private final AccountService accounts;
    private final ProjectService projects;

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
        return projects.projectManagerOf(projectId)
                .filter(pm -> !employees.activeIds(Set.of(pm)).isEmpty());
    }

    @Override
    public Set<UUID> employeesWithRole(Role role) {
        return employees.activeIds(accounts.employeeIdsWithRole(role));
    }
}
