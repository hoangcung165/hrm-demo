package com.hrmdemo.dto.auth;

import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.accessscope.DataScope;
import com.hrmdemo.dto.accessscope.Permission;

/**
 * The signed-in Account with its Access scope, so the UI can hide what the Account may not use.
 *
 * @param fullName    the Account's own name; from HRM-06 the name of the linked Employee
 * @param dataScope   whose records the Account sees
 * @param permissions features the Account may use
 * @param orgUnitIds  with data scope {@code ORG_UNIT}: the units the Account's Employee heads and every unit
 *                    below them; empty otherwise
 * @param employeeId  the Employee the Account is linked to, or null
 */
public record MeResponse(UUID id, String email, String fullName, Set<String> roles, DataScope dataScope,
        Set<Permission> permissions, Set<UUID> orgUnitIds, UUID employeeId) {
}
