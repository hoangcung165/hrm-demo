package com.hrmdemo.service.employee;

import java.util.Collection;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hrmdemo.dto.auth.AccountEmployee;
import com.hrmdemo.dto.orgunit.OrgUnitSummary;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.service.auth.AccountEmployees;
import com.hrmdemo.service.orgunit.OrgUnitService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** The Employee side of the link between a Tài khoản and a Nhân viên. */
@Component
@RequiredArgsConstructor
class EmployeeAccountLink implements AccountEmployees {

    private final EmployeeRepository employees;
    private final OrgUnitService orgUnitService;

    @Override
    @Transactional(readOnly = true)
    public boolean isActiveEmployee(UUID employeeId) {
        return employees.findById(employeeId).filter(Employee::isActive).isPresent();
    }

    @Override
    @Transactional(readOnly = true)
    public Map<UUID, AccountEmployee> describe(Collection<UUID> employeeIds) {
        if (employeeIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, OrgUnitSummary> units = orgUnitService.summaries().stream()
                .collect(Collectors.toMap(OrgUnitSummary::id, Function.identity()));
        return employees.findAllById(Set.copyOf(employeeIds)).stream()
                .collect(Collectors.toMap(Employee::getId, employee -> {
                    OrgUnitSummary unit = employee.getOrgUnitId() == null ? null : units.get(employee.getOrgUnitId());
                    return new AccountEmployee(employee.getId(), employee.getFullName(), employee.getCode(),
                            unit == null ? null : unit.name(), employee.getStatus().name());
                }));
    }
}
