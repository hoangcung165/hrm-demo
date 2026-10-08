package com.hrmdemo.service.orgunit;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.dto.orgunit.OrgUnitHead;
import com.hrmdemo.dto.orgunit.OrgUnitSummary;

/**
 * What the org structure needs to know about Nhân viên (Employees): who can head a unit and how many
 * people a unit has. Implemented in the employee service package, which reads the employee table only, so the
 * org structure does not depend on the employee services. All answers are for the current Legal entity.
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

    /**
     * Whether making {@code headEmployeeId} a head would put a loop into the effective Quản lý trực tiếp chain.
     * Every chain that changes with a new head now ends at that head, so a new loop must pass through it: the
     * check walks up from the head, with the units as they would be after the change, and looks for the head.
     *
     * @param unitsAfter every unit of the company, with the new head already in place
     */
    boolean closesManagerCycle(UUID headEmployeeId, Collection<OrgUnitSummary> unitsAfter);
}
