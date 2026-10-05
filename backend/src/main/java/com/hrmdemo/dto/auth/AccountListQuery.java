package com.hrmdemo.dto.auth;

/**
 * Query of the Account list, as it arrives: the service checks every value.
 *
 * @param page   page number from 0
 * @param size   rows per page, 1 to 100
 * @param q      part of the full name or email; case and accents do not matter
 * @param role   one role name
 * @param status {@code ACTIVE} or {@code LOCKED}
 * @param sort   {@code fullName}, {@code email}, {@code createdAt} or {@code status}, optionally followed by
 *               {@code ,asc} or {@code ,desc}
 */
public record AccountListQuery(int page, int size, String q, String role, String status, String sort) {
}
