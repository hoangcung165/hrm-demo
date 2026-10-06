package com.hrmdemo.service.employee;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;

import com.hrmdemo.dto.orgunit.OrgUnitSummary;
import com.hrmdemo.entity.employee.Employee;

/**
 * The effective Quản lý trực tiếp of many Employees at once, worked out in memory from the units and one load of
 * the candidate managers: the chosen manager, or else the first head, walking up from the Employee's unit, that
 * is an active Employee other than the Employee itself. Same rule as {@code EmployeeService.unitHead}.
 */
final class EffectiveManagers {

    private final Map<UUID, OrgUnitSummary> units;
    private final Map<UUID, Employee> candidates;

    private EffectiveManagers(Map<UUID, OrgUnitSummary> units, Map<UUID, Employee> candidates) {
        this.units = units;
        this.candidates = candidates;
    }

    /**
     * @param units by id, every unit of the company
     * @param load  loads Employees by id; called at most once
     */
    static EffectiveManagers of(Collection<Employee> employees, Map<UUID, OrgUnitSummary> units,
            Function<Collection<UUID>, List<Employee>> load) {
        Set<UUID> ids = new HashSet<>();
        for (Employee employee : employees) {
            if (employee.getManagerId() != null) {
                ids.add(employee.getManagerId());
            } else {
                for (OrgUnitSummary unit : chain(employee.getOrgUnitId(), units)) {
                    if (unit.headEmployeeId() != null) {
                        ids.add(unit.headEmployeeId());
                    }
                }
            }
        }
        Map<UUID, Employee> candidates = new HashMap<>();
        if (!ids.isEmpty()) {
            load.apply(ids).forEach(candidate -> candidates.put(candidate.getId(), candidate));
        }
        return new EffectiveManagers(units, candidates);
    }

    Optional<Employee> of(Employee employee) {
        if (employee.getManagerId() != null) {
            return Optional.ofNullable(candidates.get(employee.getManagerId()));
        }
        for (OrgUnitSummary unit : chain(employee.getOrgUnitId(), units)) {
            UUID headId = unit.headEmployeeId();
            if (headId == null || headId.equals(employee.getId())) {
                continue;
            }
            Employee head = candidates.get(headId);
            if (head != null && head.isActive()) {
                return Optional.of(head);
            }
        }
        return Optional.empty();
    }

    /** The unit and the units above it, nearest first; stops on a repeated unit. */
    private static List<OrgUnitSummary> chain(UUID orgUnitId, Map<UUID, OrgUnitSummary> units) {
        List<OrgUnitSummary> chain = new ArrayList<>();
        Set<UUID> seen = new HashSet<>();
        UUID current = orgUnitId;
        while (current != null && seen.add(current)) {
            OrgUnitSummary unit = units.get(current);
            if (unit == null) {
                break;
            }
            chain.add(unit);
            current = unit.parentId();
        }
        return chain;
    }
}
