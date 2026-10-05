package com.hrmdemo.service.accessscope;

import java.util.Collections;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.accessscope.DataScope;
import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.exception.ApiException;
import org.springframework.http.HttpStatus;

/**
 * Phạm vi truy cập (Access scope) of one Account: which records it may see and which features it may use.
 * Services ask this value instead of checking roles themselves: {@code covers...} / {@code require...} for
 * one record, {@link #employeeFilter()} for a list.
 * HRM-15 adds the managed Projects next to {@code orgUnitIds}.
 *
 * @param accountId   the Account the scope belongs to
 * @param employeeId  the Employee the Account is linked to, or null (system administration Accounts)
 * @param dataScope   how far the Account sees
 * @param orgUnitIds  with {@link DataScope#ORG_UNIT}: the units the Employee heads and every unit below them;
 *                    empty for the other scopes
 * @param permissions features the Account may use
 */
public record AccessScope(UUID accountId, UUID employeeId, DataScope dataScope, Set<UUID> orgUnitIds,
        Set<Permission> permissions) {

    /**
     * The scope as one list filter over Employee-owned records: everything when {@code all}, otherwise the
     * records of Employees in {@code orgUnitIds} plus those of {@code selfEmployeeId} (null: none of its own).
     * Query shape: {@code :all = true or e.orgUnitId in :orgUnitIds or e.id = :selfEmployeeId}.
     */
    public record EmployeeFilter(boolean all, Set<UUID> orgUnitIds, UUID selfEmployeeId) {
    }

    public AccessScope {
        orgUnitIds = Collections.unmodifiableSet(new LinkedHashSet<>(orgUnitIds));
        // EnumSet keeps the declaration order, so the API lists permissions in a stable order.
        Set<Permission> copy = EnumSet.noneOf(Permission.class);
        copy.addAll(permissions);
        permissions = Collections.unmodifiableSet(copy);
    }

    public boolean has(Permission permission) {
        return permissions.contains(permission);
    }

    /** Whether the Account may see the records of the given Account: always its own, others with company scope. */
    public boolean coversAccount(UUID otherAccountId) {
        return dataScope == DataScope.COMPANY || accountId.equals(otherAccountId);
    }

    /** Whether the Account may see the records of the given Organization unit as a whole. */
    public boolean coversOrgUnit(UUID orgUnitId) {
        return dataScope == DataScope.COMPANY || (orgUnitId != null && orgUnitIds.contains(orgUnitId));
    }

    /**
     * Whether the Account may see the records of the given Employee: always its own Employee, the members
     * of its units, everyone with company scope.
     *
     * @param orgUnitId the unit the other Employee belongs to, or null when they belong to none
     */
    public boolean coversEmployee(UUID otherEmployeeId, UUID orgUnitId) {
        return (employeeId != null && employeeId.equals(otherEmployeeId)) || coversOrgUnit(orgUnitId);
    }

    public EmployeeFilter employeeFilter() {
        return new EmployeeFilter(dataScope == DataScope.COMPANY, orgUnitIds, employeeId);
    }

    public void require(Permission permission) {
        if (!has(permission)) {
            throw forbidden();
        }
    }

    public void requireAccount(UUID otherAccountId) {
        if (!coversAccount(otherAccountId)) {
            throw forbidden();
        }
    }

    public void requireOrgUnit(UUID orgUnitId) {
        if (!coversOrgUnit(orgUnitId)) {
            throw forbidden();
        }
    }

    public void requireEmployee(UUID otherEmployeeId, UUID orgUnitId) {
        if (!coversEmployee(otherEmployeeId, orgUnitId)) {
            throw forbidden();
        }
    }

    private static ApiException forbidden() {
        // Same code as Spring Security's access-denied response (ProblemJsonSecurityHandler).
        return new ApiException(HttpStatus.FORBIDDEN, "auth.forbidden", "Access is denied");
    }
}
