package com.hrmdemo.dto.catalog;

import java.util.UUID;

/**
 * A catalog item as a record that refers to it shows it; {@code active} is false when the item was deactivated
 * after it was assigned. Holidays have no code.
 */
public record CatalogItemRef(UUID id, String code, String name, boolean active) {
}
