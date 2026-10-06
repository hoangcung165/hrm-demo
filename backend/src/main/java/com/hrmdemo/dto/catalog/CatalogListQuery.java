package com.hrmdemo.dto.catalog;

/**
 * Query of a catalog list, as it arrives: the service checks every value.
 *
 * @param page   page number from 0
 * @param size   rows per page, 1 to 200
 * @param q      part of the name or the code; case and accents do not matter
 * @param status {@code ACTIVE} or {@code INACTIVE}; blank for both
 * @param year   holidays only: those whose days touch this year
 */
public record CatalogListQuery(int page, int size, String q, String status, Integer year) {
}
