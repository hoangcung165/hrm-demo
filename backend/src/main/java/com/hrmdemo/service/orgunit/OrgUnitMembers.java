package com.hrmdemo.service.orgunit;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.dto.orgunit.OrgUnitHead;

/**
 * What the org structure needs to know about Nhân viên (Employees): who can head a unit and how many
 * people a unit has. Employees arrive with HRM-06, which supplies the real implementation in its own
 * service package and removes {@link NoEmployeesYet}. All answers are for the current Legal entity.
 */
public interface OrgUnitMembers {

    /** Active Employees per unit they belong to directly. Units without Employees may be missing. */
    Map<UUID, Long> headcountByOrgUnit();

    /** Active Employees of the whole company, including those who belong to no unit. */
    long companyHeadcount();

    /**
     * Employee records that still point at the unit, whatever their status. Any of them blocks deleting
     * the unit, so this can be higher than the headcount.
     */
    long countAssigned(UUID orgUnitId);

    /** An active Employee who may be made head of a unit; empty when there is none with this id. */
    Optional<OrgUnitHead> findHead(UUID employeeId);

    /** Display data of the current heads, by Employee id. Ids that match no Employee are left out. */
    Map<UUID, OrgUnitHead> findHeads(Collection<UUID> employeeIds);
}
