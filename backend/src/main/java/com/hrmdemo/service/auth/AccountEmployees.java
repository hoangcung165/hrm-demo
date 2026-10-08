package com.hrmdemo.service.auth;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;

import com.hrmdemo.dto.auth.AccountEmployee;

/**
 * What Accounts need to know about Nhân viên (Employees). Implemented in the employee service package.
 * All answers are for the current Legal entity.
 */
public interface AccountEmployees {

    /** Whether the id is an active Employee, so an Account may be linked to it. */
    boolean isActiveEmployee(UUID employeeId);

    /** The linked Employees as shown next to their Accounts, by Employee id; unknown ids are left out. */
    Map<UUID, AccountEmployee> describe(Collection<UUID> employeeIds);
}
