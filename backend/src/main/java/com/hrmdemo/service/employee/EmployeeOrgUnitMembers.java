package com.hrmdemo.service.employee;

import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hrmdemo.dto.catalog.CatalogItemRef;
import com.hrmdemo.dto.orgunit.OrgUnitHead;
import com.hrmdemo.dto.orgunit.OrgUnitSummary;
import com.hrmdemo.entity.catalog.Catalog;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.EmployeeStatus;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.service.catalog.CatalogService;
import com.hrmdemo.service.orgunit.OrgUnitMembers;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Unit headcounts and heads from the employee table. Reads Employees and positions only, never the org services,
 * so {@code OrgUnitService} can depend on it without a cycle.
 */
@Component
@RequiredArgsConstructor
class EmployeeOrgUnitMembers implements OrgUnitMembers {

    private final EmployeeRepository employees;
    private final CatalogService catalogService;

    @Override
    @Transactional(readOnly = true)
    public Map<UUID, Long> headcountByOrgUnit() {
        Map<UUID, Long> counts = new HashMap<>();
        for (Object[] row : employees.countActiveByOrgUnit()) {
            counts.put((UUID) row[0], (Long) row[1]);
        }
        return counts;
    }

    @Override
    @Transactional(readOnly = true)
    public long companyHeadcount() {
        return employees.countByStatusNot(EmployeeStatus.INACTIVE);
    }

    @Override
    @Transactional(readOnly = true)
    public long countAssigned(UUID orgUnitId) {
        return employees.countByOrgUnitId(orgUnitId);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<OrgUnitHead> findHead(UUID employeeId) {
        return employees.findById(employeeId)
                .filter(Employee::isActive)
                .map(employee -> toHead(employee, positions(List.of(employee))));
    }

    /** Heads who left (Inactive) are still shown: the unit keeps pointing at them until someone else is chosen. */
    @Override
    @Transactional(readOnly = true)
    public Map<UUID, OrgUnitHead> findHeads(Collection<UUID> employeeIds) {
        if (employeeIds.isEmpty()) {
            return Map.of();
        }
        List<Employee> heads = employees.findAllById(Set.copyOf(employeeIds));
        Map<UUID, CatalogItemRef> positions = positions(heads);
        return heads.stream().collect(Collectors.toMap(Employee::getId, head -> toHead(head, positions)));
    }

    /** The same rule as {@code EmployeeService.requireNoCycle}, with the units given instead of the stored ones. */
    @Override
    @Transactional(readOnly = true)
    public boolean closesManagerCycle(UUID headEmployeeId, Collection<OrgUnitSummary> unitsAfter) {
        Map<UUID, OrgUnitSummary> units = unitsAfter.stream()
                .collect(Collectors.toMap(OrgUnitSummary::id, Function.identity()));
        Set<UUID> seen = new HashSet<>();
        UUID current = headEmployeeId;
        while (current != null && seen.add(current)) {
            Optional<Employee> link = employees.findById(current);
            if (link.isEmpty()) {
                return false;
            }
            Employee employee = link.get();
            UUID next = employee.getManagerId() != null ? employee.getManagerId() : defaultManager(employee, units);
            if (headEmployeeId.equals(next)) {
                return true;
            }
            current = next;
        }
        return false;
    }

    /** Walking up from the Employee's unit, the first head that is an active Employee other than itself. */
    private UUID defaultManager(Employee employee, Map<UUID, OrgUnitSummary> units) {
        Set<UUID> seen = new HashSet<>();
        UUID unitId = employee.getOrgUnitId();
        while (unitId != null && seen.add(unitId)) {
            OrgUnitSummary unit = units.get(unitId);
            if (unit == null) {
                return null;
            }
            UUID headId = unit.headEmployeeId();
            if (headId != null && !headId.equals(employee.getId())
                    && employees.findById(headId).filter(Employee::isActive).isPresent()) {
                return headId;
            }
            unitId = unit.parentId();
        }
        return null;
    }

    private Map<UUID, CatalogItemRef> positions(Collection<Employee> heads) {
        return catalogService.findItems(Catalog.POSITION,
                heads.stream().map(Employee::getPositionId).collect(Collectors.toSet()));
    }

    private static OrgUnitHead toHead(Employee employee, Map<UUID, CatalogItemRef> positions) {
        CatalogItemRef position = positions.get(employee.getPositionId());
        return new OrgUnitHead(employee.getId(), employee.getFullName(), employee.getCode(),
                position == null ? null : position.name(), null);
    }
}
