package com.hrmdemo.repository.project;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.entity.project.ProjectAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/** Phân bổ; filtered by Legal entity (ADR 0003). */
public interface ProjectAllocationRepository extends JpaRepository<ProjectAllocation, UUID> {

    List<ProjectAllocation> findByProjectId(UUID projectId);

    List<ProjectAllocation> findByProjectIdIn(Collection<UUID> projectIds);

    /** Every allocation of these Employees, on any project, that has not ended before {@code from}. */
    List<ProjectAllocation> findByEmployeeIdInAndEndDateGreaterThanEqual(Collection<UUID> employeeIds,
            LocalDate from);

    /** Every allocation of these Employees, on any project, that overlaps {@code [from, to]}. */
    List<ProjectAllocation> findByEmployeeIdInAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            Collection<UUID> employeeIds, LocalDate to, LocalDate from);

    /** Every allocation that has not ended before {@code from}, whatever the project. */
    List<ProjectAllocation> findByEndDateGreaterThanEqual(LocalDate from);

    /** The allocation of this Employee that starts first after {@code day}. */
    Optional<ProjectAllocation> findFirstByEmployeeIdAndStartDateGreaterThanOrderByStartDateAsc(UUID employeeId,
            LocalDate day);

    @Query("select distinct a.projectRoleId from ProjectAllocation a where a.projectRoleId in :ids")
    Set<UUID> findProjectRoleIdsIn(Collection<UUID> ids);
}
