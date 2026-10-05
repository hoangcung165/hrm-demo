package com.hrmdemo.service.orgunit;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.entity.orgunit.OrgUnit;
import com.hrmdemo.repository.orgunit.OrgUnitRepository;
import com.hrmdemo.service.accessscope.ManagedOrgUnits;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * The units a Trưởng đơn vị manages, for the Access scope: the units they head and every unit below.
 * Inactive units count like active ones: their Employees are still there.
 * Not part of {@link OrgUnitService}, which itself asks the Access scope.
 */
@Component
@RequiredArgsConstructor
class HeadedOrgUnits implements ManagedOrgUnits {

    private final OrgUnitRepository orgUnits;

    @Override
    @Transactional(readOnly = true)
    public Set<UUID> unitIdsManagedBy(UUID employeeId) {
        List<OrgUnit> units = orgUnits.findAll();
        List<UUID> headed = units.stream()
                .filter(unit -> employeeId.equals(unit.getHeadEmployeeId()))
                .map(OrgUnit::getId)
                .toList();
        return headed.isEmpty() ? Set.of() : new OrgTree(units).withDescendants(headed);
    }
}
