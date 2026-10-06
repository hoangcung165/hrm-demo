package com.hrmdemo.entity.catalog;

import java.util.Optional;

/**
 * The six Danh mục (catalogs) of HRM-05. {@code key} is the name in the API path ({@code /api/catalogs/{key}}).
 * Leave types and shifts carry rules of their own and get their own screens (HRM-18, HRM-22), not a catalog.
 */
public enum Catalog {
    /** Chức danh. */
    POSITION("positions"),
    /** Loại hợp đồng: with a {@link ContractTerm}. */
    CONTRACT_TYPE("contract-types"),
    /** Loại phụ cấp: with whether it counts for social insurance and for personal income tax. */
    ALLOWANCE_TYPE("allowance-types"),
    /** Ngày lễ: a date range instead of a code. */
    HOLIDAY("holidays"),
    /** Kỹ năng. */
    SKILL("skills"),
    /** Vai trò dự án. */
    PROJECT_ROLE("project-roles");

    private final String key;

    Catalog(String key) {
        this.key = key;
    }

    public String key() {
        return key;
    }

    /** Holidays are known by their name and dates; every other item has a code. */
    public boolean hasCode() {
        return this != HOLIDAY;
    }

    public static Optional<Catalog> byKey(String key) {
        for (Catalog catalog : values()) {
            if (catalog.key.equals(key)) {
                return Optional.of(catalog);
            }
        }
        return Optional.empty();
    }
}
