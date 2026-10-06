package com.hrmdemo.entity.catalog;

import java.time.LocalDate;

/**
 * The editable fields of a {@link CatalogItem}, already checked against its catalog: fields that belong to
 * another catalog are null.
 */
public record CatalogItemFields(String code, String name, ContractTerm term, Integer maxMonths, Boolean insurable,
        Boolean taxable, LocalDate startDate, LocalDate endDate) {
}
