package com.hrmdemo.repository.catalog;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import com.hrmdemo.entity.catalog.Catalog;
import com.hrmdemo.entity.catalog.CatalogItem;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

/** Filters of a catalog list. The Legal entity filter is added by Hibernate. */
public final class CatalogItemSpecifications {

    private CatalogItemSpecifications() {
    }

    /**
     * Items of one catalog that pass every given filter; a null filter is left out.
     *
     * @param searchPattern LIKE pattern (see {@code SearchText.containsPattern}) over the name and the code,
     *                      with {@code \} as the escape character
     * @param active        true for active items, false for inactive ones
     * @param year          holidays only: those whose days touch this year
     */
    public static Specification<CatalogItem> matching(Catalog catalog, String searchPattern, Boolean active,
            Integer year) {
        return (root, query, cb) -> {
            List<Predicate> filters = new ArrayList<>();
            filters.add(cb.equal(root.get("catalog"), catalog));
            if (searchPattern != null) {
                filters.add(cb.or(
                        cb.like(root.<String>get("searchText"), searchPattern, '\\'),
                        cb.like(cb.lower(root.<String>get("code")), searchPattern, '\\')));
            }
            if (active != null) {
                filters.add(cb.equal(root.get("active"), active));
            }
            if (year != null) {
                filters.add(cb.lessThanOrEqualTo(root.<LocalDate>get("startDate"), LocalDate.of(year, 12, 31)));
                filters.add(cb.greaterThanOrEqualTo(root.<LocalDate>get("endDate"), LocalDate.of(year, 1, 1)));
            }
            return cb.and(filters.toArray(Predicate[]::new));
        };
    }
}
