package com.hrmdemo.service.auth;

import java.util.UUID;

/**
 * What Accounts need to know about Nhân viên (Employees). Employees arrive with HRM-06, which supplies the
 * real implementation in its own service package and removes {@link NoEmployeesToLinkYet}.
 * All answers are for the current Legal entity.
 */
public interface AccountEmployees {

    /** Whether the id is an active Employee, so an Account may be linked to it. */
    boolean isActiveEmployee(UUID employeeId);
}
