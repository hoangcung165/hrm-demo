package com.hrmdemo.service.orgunit;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.dto.orgunit.OrgUnitHead;
import org.springframework.stereotype.Component;

/**
 * Stand-in until Employees exist (HRM-06): nobody belongs to a unit and nobody can be made head, so every
 * headcount is 0 and a non-null head is rejected. HRM-06 deletes this class when it adds the real bean.
 */
@Component
class NoEmployeesYet implements OrgUnitMembers {

    @Override
    public Map<UUID, Long> headcountByOrgUnit() {
        return Map.of();
    }

    @Override
    public long companyHeadcount() {
        return 0;
    }

    @Override
    public long countAssigned(UUID orgUnitId) {
        return 0;
    }

    @Override
    public Optional<OrgUnitHead> findHead(UUID employeeId) {
        return Optional.empty();
    }

    @Override
    public Map<UUID, OrgUnitHead> findHeads(Collection<UUID> employeeIds) {
        return Map.of();
    }
}
