package com.hrmdemo.service.approval;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.entity.auth.Role;

/**
 * Who could approve, looked up in the org structure and the Accounts. Approvers are Employees (they act through
 * the Account linked to them). The approval engine asks this and never reads the org tree itself; HRM-12/BE-3
 * backs it with the org units, the Employees and the Accounts.
 */
public interface ApproverDirectory {

    /** The effective Quản lý trực tiếp of the Employee (people glossary), if any. Never the Employee itself. */
    Optional<UUID> lineManagerOf(UUID employeeId);

    /**
     * The active Trưởng đơn vị of the unit above the Employee's own unit, if any. Used when a request has to go up
     * past the sender.
     */
    Optional<UUID> parentUnitHeadOf(UUID employeeId);

    /** The PM of the project, if the project has one. */
    Optional<UUID> projectManagerOf(UUID projectId);

    /** The active Employees whose Account holds the role and is not locked. */
    Set<UUID> employeesWithRole(Role role);
}
