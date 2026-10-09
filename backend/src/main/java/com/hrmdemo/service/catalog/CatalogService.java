package com.hrmdemo.service.catalog;

import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;

import com.hrmdemo.dto.PageResponse;
import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.catalog.CatalogItemRef;
import com.hrmdemo.dto.catalog.CatalogItemRequest;
import com.hrmdemo.dto.catalog.CatalogItemResponse;
import com.hrmdemo.dto.catalog.CatalogListQuery;
import com.hrmdemo.dto.catalog.HolidayYearsResponse;
import com.hrmdemo.entity.SearchText;
import com.hrmdemo.entity.catalog.Catalog;
import com.hrmdemo.entity.catalog.CatalogItem;
import com.hrmdemo.entity.catalog.CatalogItemFields;
import com.hrmdemo.entity.catalog.ContractTerm;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.catalog.CatalogItemRepository;
import com.hrmdemo.repository.catalog.CatalogItemSpecifications;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.legalentity.LegalEntityService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * The Danh mục (catalogs) of the company: list, add, edit, deactivate, reactivate and delete. Reading is open
 * to every signed-in Account, since forms elsewhere offer the active items; changes need
 * {@link Permission#CATALOG_EDIT}.
 * <p>
 * Every change takes the company-wide lock first, so two changes at the same time cannot both take a code or
 * a name, or both add overlapping holidays.
 */
@Service
@RequiredArgsConstructor
public class CatalogService {

    static final int MAX_PAGE_SIZE = 200;
    static final int MAX_SEARCH_LENGTH = 100;
    static final int MAX_HOLIDAY_DAYS = 10;
    static final int MAX_FIXED_TERM_MONTHS = 36;
    private static final String CODE_PATTERN = "[A-Z0-9_-]{2,20}";

    private final CatalogItemRepository items;
    private final CatalogUsage usage;
    private final AccessScopeService accessScopes;
    private final LegalEntityService legalEntityService;
    private final Clock clock;

    /** One page of a catalog, ordered by name (holidays by date). */
    @Transactional(readOnly = true)
    public PageResponse<CatalogItemResponse> items(String catalogKey, CatalogListQuery query) {
        Catalog catalog = catalog(catalogKey);
        if (query.page() < 0) {
            throw invalid("page");
        }
        if (query.size() < 1 || query.size() > MAX_PAGE_SIZE) {
            throw invalid("size");
        }
        if (query.q() != null && query.q().length() > MAX_SEARCH_LENGTH) {
            throw invalid("q");
        }
        if (query.year() != null && (catalog != Catalog.HOLIDAY || query.year() < 1900 || query.year() > 9999)) {
            throw invalid("year");
        }
        Boolean active = status(query.status());
        // A term of only spaces or accents searches for nothing.
        String search = query.q() == null || SearchText.of(query.q()).isEmpty()
                ? null
                : SearchText.containsPattern(query.q());
        Sort sort = catalog == Catalog.HOLIDAY
                ? Sort.by("startDate", "id")
                : Sort.by("searchText", "id");
        Page<CatalogItem> page = items.findAll(
                CatalogItemSpecifications.matching(catalog, search, active, query.year()),
                PageRequest.of(query.page(), query.size(), sort));
        Set<UUID> used = usage.inUse(catalog, page.getContent().stream().map(CatalogItem::getId).toList());
        return PageResponse.of(page, item -> toResponse(item, used.contains(item.getId())));
    }

    /** The years in which a holiday falls, ascending. */
    @Transactional(readOnly = true)
    public HolidayYearsResponse holidayYears() {
        Set<Integer> years = new TreeSet<>();
        for (CatalogItem holiday : items.findByCatalog(Catalog.HOLIDAY)) {
            for (int year = holiday.getStartDate().getYear(); year <= holiday.getEndDate().getYear(); year++) {
                years.add(year);
            }
        }
        return new HolidayYearsResponse(List.copyOf(years));
    }

    /**
     * One item of a catalog, active or not, as a record that refers to it shows it; empty when the catalog has no
     * item with this id. For other features' services, e.g. to check a Chức danh before it is assigned.
     */
    @Transactional(readOnly = true)
    public Optional<CatalogItemRef> findItem(Catalog catalog, UUID id) {
        return items.findByIdAndCatalog(id, catalog)
                .map(item -> new CatalogItemRef(item.getId(), item.getCode(), item.getName(), item.isActive()));
    }

    /** {@link #findItem} by code (not for holidays, which have none); for startup seeders. */
    @Transactional(readOnly = true)
    public Optional<CatalogItemRef> findItemByCode(Catalog catalog, String code) {
        return items.findByCatalogAndCode(catalog, code)
                .map(item -> new CatalogItemRef(item.getId(), item.getCode(), item.getName(), item.isActive()));
    }

    /**
     * The active items of a catalog by code (not for holidays, which have none), e.g. the Chức danh codes a file
     * may use. For other features' services: no permission check.
     */
    @Transactional(readOnly = true)
    public List<CatalogItemRef> activeItems(Catalog catalog) {
        return items.findByCatalog(catalog).stream()
                .filter(CatalogItem::isActive)
                .map(item -> new CatalogItemRef(item.getId(), item.getCode(), item.getName(), true))
                .sorted(Comparator.comparing(CatalogItemRef::code))
                .toList();
    }

    /**
     * Every item of a catalog, active or not, sorted by code; e.g. to look up the Chức danh codes of a whole import
     * file in one query. For other features' services: no permission check.
     */
    @Transactional(readOnly = true)
    public List<CatalogItemRef> allItems(Catalog catalog) {
        return items.findByCatalog(catalog).stream()
                .map(item -> new CatalogItemRef(item.getId(), item.getCode(), item.getName(), item.isActive()))
                .sorted(Comparator.comparing(CatalogItemRef::code, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    /** {@link #findItem} for many ids at once, by id; ids that are no item of the catalog are left out. */
    @Transactional(readOnly = true)
    public Map<UUID, CatalogItemRef> findItems(Catalog catalog, Collection<UUID> ids) {
        Map<UUID, CatalogItemRef> found = new HashMap<>();
        if (ids.isEmpty()) {
            return found;
        }
        for (CatalogItem item : items.findAllById(Set.copyOf(ids))) {
            if (item.getCatalog() == catalog) {
                found.put(item.getId(), new CatalogItemRef(item.getId(), item.getCode(), item.getName(),
                        item.isActive()));
            }
        }
        return found;
    }

    @Transactional
    public CatalogItemResponse create(CurrentAccount caller, String catalogKey, CatalogItemRequest request) {
        Catalog catalog = catalogForChange(caller, catalogKey);
        return create(catalog, request);
    }

    /**
     * Adds default items for code that runs without a signed-in Account (the defaults seeder). An item whose code,
     * name or dates the company already uses is skipped, not refused: the company's own item stays as it is.
     *
     * @return how many items were added
     */
    @Transactional
    public int addDefaultsAsSystem(Catalog catalog, List<CatalogItemRequest> defaults) {
        legalEntityService.lockForStructureChange();
        int added = 0;
        for (CatalogItemRequest request : defaults) {
            CatalogItemFields fields = fields(catalog, request);
            if (conflict(catalog, fields, null).isEmpty()) {
                items.save(new CatalogItem(catalog, fields, clock.instant()));
                added++;
            }
        }
        return added;
    }

    private CatalogItemResponse create(Catalog catalog, CatalogItemRequest request) {
        CatalogItemFields fields = fields(catalog, request);
        requireFree(catalog, fields, null);
        CatalogItem item = items.save(new CatalogItem(catalog, fields, clock.instant()));
        return toResponse(item, false);
    }

    /** Replaces the fields of the item; its status does not change. */
    @Transactional
    public CatalogItemResponse update(CurrentAccount caller, String catalogKey, UUID id, CatalogItemRequest request) {
        Catalog catalog = catalogForChange(caller, catalogKey);
        CatalogItem item = require(catalog, id);
        CatalogItemFields fields = fields(catalog, request);
        requireFree(catalog, fields, item);
        item.update(fields, clock.instant());
        return toResponse(item, isInUse(item));
    }

    /** Always allowed, also for an item in use: it stays on existing records and is not offered for new ones. */
    @Transactional
    public CatalogItemResponse deactivate(CurrentAccount caller, String catalogKey, UUID id) {
        CatalogItem item = require(catalogForChange(caller, catalogKey), id);
        if (item.isActive()) {
            item.deactivate(clock.instant());
        }
        return toResponse(item, isInUse(item));
    }

    @Transactional
    public CatalogItemResponse reactivate(CurrentAccount caller, String catalogKey, UUID id) {
        CatalogItem item = require(catalogForChange(caller, catalogKey), id);
        if (!item.isActive()) {
            item.reactivate(clock.instant());
        }
        return toResponse(item, isInUse(item));
    }

    /** Only an item that nothing refers to can be deleted; otherwise deactivate it. */
    @Transactional
    public void delete(CurrentAccount caller, String catalogKey, UUID id) {
        CatalogItem item = require(catalogForChange(caller, catalogKey), id);
        if (isInUse(item)) {
            throw new ApiException(HttpStatus.CONFLICT, "catalog.item_in_use",
                    "The item is in use and can only be deactivated");
        }
        items.delete(item);
    }

    /** Permission check, then the catalog, then the lock. */
    private Catalog catalogForChange(CurrentAccount caller, String catalogKey) {
        accessScopes.scopeOf(caller).require(Permission.CATALOG_EDIT);
        Catalog catalog = catalog(catalogKey);
        legalEntityService.lockForStructureChange();
        return catalog;
    }

    private CatalogItem require(Catalog catalog, UUID id) {
        return items.findByIdAndCatalog(id, catalog).orElseThrow(CatalogService::notFound);
    }

    private boolean isInUse(CatalogItem item) {
        return usage.inUse(item.getCatalog(), List.of(item.getId())).contains(item.getId());
    }

    /** The fields the catalog takes, checked; a field of another catalog is refused rather than ignored. */
    static CatalogItemFields fields(Catalog catalog, CatalogItemRequest request) {
        String code = null;
        if (catalog.hasCode()) {
            if (request.code() == null || !request.code().matches(CODE_PATTERN)) {
                throw invalid("code");
            }
            code = request.code();
        } else if (request.code() != null) {
            throw invalid("code");
        }

        ContractTerm term = null;
        Integer maxMonths = null;
        if (catalog == Catalog.CONTRACT_TYPE) {
            term = term(request.term());
            if (term == ContractTerm.FIXED) {
                if (request.maxMonths() == null || request.maxMonths() < 1
                        || request.maxMonths() > MAX_FIXED_TERM_MONTHS) {
                    throw invalid("maxMonths");
                }
                maxMonths = request.maxMonths();
            } else if (request.maxMonths() != null) {
                throw invalid("maxMonths");
            }
        } else {
            refuse(request.term(), "term");
            refuse(request.maxMonths(), "maxMonths");
        }

        Boolean insurable = null;
        Boolean taxable = null;
        if (catalog == Catalog.ALLOWANCE_TYPE) {
            insurable = required(request.insurable(), "insurable");
            taxable = required(request.taxable(), "taxable");
        } else {
            refuse(request.insurable(), "insurable");
            refuse(request.taxable(), "taxable");
        }

        LocalDate startDate = null;
        LocalDate endDate = null;
        if (catalog == Catalog.HOLIDAY) {
            startDate = required(request.startDate(), "startDate");
            endDate = required(request.endDate(), "endDate");
            if (endDate.isBefore(startDate) || ChronoUnit.DAYS.between(startDate, endDate) >= MAX_HOLIDAY_DAYS) {
                throw invalid("endDate");
            }
        } else {
            refuse(request.startDate(), "startDate");
            refuse(request.endDate(), "endDate");
        }
        return new CatalogItemFields(code, request.name(), term, maxMonths, insurable, taxable, startDate, endDate);
    }

    /**
     * Code and name are unique within the catalog (a holiday name within its year), and holidays do not overlap;
     * {@code self} is the edited item.
     */
    private void requireFree(Catalog catalog, CatalogItemFields fields, CatalogItem self) {
        Optional<ApiException> conflict = conflict(catalog, fields, self);
        if (conflict.isPresent()) {
            throw conflict.get();
        }
    }

    /** What {@link #requireFree} would throw, if anything. */
    private Optional<ApiException> conflict(Catalog catalog, CatalogItemFields fields, CatalogItem self) {
        if (fields.code() != null && items.findByCatalogAndCode(catalog, fields.code())
                .filter(other -> other != self)
                .isPresent()) {
            return Optional.of(new ApiException(HttpStatus.CONFLICT, "catalog.code_taken",
                    "The code is already used in this catalog"));
        }
        String searchText = SearchText.of(fields.name());
        // A holiday name repeats every year: it is unique within the year of the first day.
        Optional<CatalogItem> nameHolder = (catalog == Catalog.HOLIDAY
                ? items.findFirstByCatalogAndSearchTextAndStartDateBetween(catalog, searchText,
                        fields.startDate().withDayOfYear(1), fields.startDate().withMonth(12).withDayOfMonth(31))
                : items.findByCatalogAndSearchText(catalog, searchText))
                .filter(other -> other != self);
        if (nameHolder.isPresent()) {
            return Optional.of(new ApiException(HttpStatus.CONFLICT, "catalog.name_taken",
                    "The name is already used in this catalog")
                    .with("holderName", nameHolder.get().getName()));
        }
        if (catalog == Catalog.HOLIDAY) {
            return items.findHolidaysTouching(fields.startDate(), fields.endDate()).stream()
                    .filter(other -> other != self)
                    .findFirst()
                    .map(other -> new ApiException(HttpStatus.CONFLICT, "catalog.holiday_overlap",
                            "The dates overlap another holiday")
                            .with("holidayName", other.getName())
                            .with("holidayStartDate", other.getStartDate().toString())
                            .with("holidayEndDate", other.getEndDate().toString()));
        }
        return Optional.empty();
    }

    static Catalog catalog(String key) {
        return Catalog.byKey(key).orElseThrow(CatalogService::notFound);
    }

    private static ContractTerm term(String value) {
        if (value != null) {
            for (ContractTerm term : ContractTerm.values()) {
                if (term.name().equals(value)) {
                    return term;
                }
            }
        }
        throw invalid("term");
    }

    private static Boolean status(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return switch (value.trim()) {
            case "ACTIVE" -> true;
            case "INACTIVE" -> false;
            default -> throw invalid("status");
        };
    }

    private static <T> T required(T value, String field) {
        if (value == null) {
            throw invalid(field);
        }
        return value;
    }

    private static void refuse(Object value, String field) {
        if (value != null) {
            throw invalid(field);
        }
    }

    private static CatalogItemResponse toResponse(CatalogItem item, boolean inUse) {
        String term = item.getTerm() == null ? null : item.getTerm().name();
        return new CatalogItemResponse(item.getId(), item.getCode(), item.getName(), item.isActive(), inUse, term,
                item.getMaxMonths(), item.getInsurable(), item.getTaxable(), item.getStartDate(), item.getEndDate(),
                item.getCreatedAt(), item.getUpdatedAt());
    }

    private static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "catalog.not_found", "Catalog or item not found");
    }

    /** Same shape as a failed body validation: {@code validation.invalid} with the field. */
    static ApiException invalid(String field) {
        return new ApiException(HttpStatus.BAD_REQUEST, "validation.invalid", "Request value is invalid: " + field)
                .with("errors", List.of(Map.of("field", field, "code", "Invalid")));
    }
}
