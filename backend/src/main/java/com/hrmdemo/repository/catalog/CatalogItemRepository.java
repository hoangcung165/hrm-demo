package com.hrmdemo.repository.catalog;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.entity.catalog.Catalog;
import com.hrmdemo.entity.catalog.CatalogItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Catalog items of the current Legal entity (Hibernate adds the filter, as for every root entity). */
public interface CatalogItemRepository extends JpaRepository<CatalogItem, UUID>, JpaSpecificationExecutor<CatalogItem> {

    Optional<CatalogItem> findByIdAndCatalog(UUID id, Catalog catalog);

    Optional<CatalogItem> findByCatalogAndCode(Catalog catalog, String code);

    /** Not for holidays, whose names repeat from year to year. */
    Optional<CatalogItem> findByCatalogAndSearchText(Catalog catalog, String searchText);

    /** A holiday of that name whose first day falls in the range (a year). */
    Optional<CatalogItem> findFirstByCatalogAndSearchTextAndStartDateBetween(Catalog catalog, String searchText,
            LocalDate from, LocalDate to);

    /** Holidays whose days touch the range, both ends included. */
    @Query("""
            select i from CatalogItem i
            where i.catalog = com.hrmdemo.entity.catalog.Catalog.HOLIDAY
              and i.startDate <= :to and i.endDate >= :from
            order by i.startDate""")
    List<CatalogItem> findHolidaysTouching(@Param("from") LocalDate from, @Param("to") LocalDate to);

    /** Every item of a catalog; for the holidays, which are a few a year. */
    List<CatalogItem> findByCatalog(Catalog catalog);
}
