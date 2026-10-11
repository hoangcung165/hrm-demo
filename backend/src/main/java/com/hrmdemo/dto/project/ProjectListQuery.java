package com.hrmdemo.dto.project;

import java.util.UUID;

/**
 * Filters of the project list.
 *
 * @param mine      only the projects the caller's Employee manages
 * @param status    comma-separated statuses; empty means every status but CLOSED
 * @param orgUnitId one owning unit
 * @param overloaded only the projects with someone Quá tải from today on
 */
public record ProjectListQuery(int page, int size, String q, boolean mine, String status, UUID orgUnitId,
        boolean overloaded) {
}
