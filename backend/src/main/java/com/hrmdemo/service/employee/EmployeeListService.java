package com.hrmdemo.service.employee;

import java.util.Arrays;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hrmdemo.dto.PageResponse;
import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.catalog.CatalogItemRef;
import com.hrmdemo.dto.employee.AssignmentRef;
import com.hrmdemo.dto.employee.EmployeeCard;
import com.hrmdemo.dto.employee.EmployeeListItem;
import com.hrmdemo.dto.employee.EmployeeListQuery;
import com.hrmdemo.dto.employee.EmployeeOption;
import com.hrmdemo.dto.employee.EmployeeOptionsQuery;
import com.hrmdemo.dto.employee.EmployeeRef;
import com.hrmdemo.dto.employee.EmployeeUnitRef;
import com.hrmdemo.dto.orgunit.OrgUnitSummary;
import com.hrmdemo.entity.SearchText;
import com.hrmdemo.entity.catalog.Catalog;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.EmployeeStatus;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.repository.employee.EmployeeSpecifications;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.catalog.CatalogService;
import com.hrmdemo.service.orgunit.OrgUnitService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * The employee list (within the caller's data scope) and the employee picker (the whole company, directory data
 * only). Filtering, sorting and paging happen in the database; a page is then completed with a fixed number of
 * queries (units, positions, managers), whatever its size.
 */
@Service
@RequiredArgsConstructor
public class EmployeeListService {

    static final int MAX_PAGE_SIZE = 100;
    static final int MAX_OPTIONS_SIZE = 50;
    static final int MAX_SEARCH_LENGTH = 100;
    static final Set<EmployeeStatus> ACTIVE = EnumSet.of(EmployeeStatus.PROBATION, EmployeeStatus.OFFICIAL);

    /** Sort keys and the property behind each. The name sorts by the search text, so accents do not matter. */
    private static final Map<String, String> SORT_PROPERTIES = Map.of(
            "code", "code",
            "fullName", "searchText",
            "hireDate", "hireDate");

    private final EmployeeRepository employees;
    private final OrgUnitService orgUnitService;
    private final CatalogService catalogService;
    private final AccessScopeService accessScopes;

    /**
     * One page of the Employees the caller may see that pass the filters. A filter outside the data scope gives
     * an empty page, not a refusal. Employees directly under the company are seen only with company scope.
     */
    @Transactional(readOnly = true)
    public PageResponse<EmployeeListItem> list(CurrentAccount caller, EmployeeListQuery query) {
        AccessScope scope = accessScopes.scopeOf(caller);
        scope.require(Permission.EMPLOYEE_VIEW);
        requirePage(query.page(), query.size(), MAX_PAGE_SIZE);
        Page<Employee> page = matching(scope, query.q(), query.orgUnitId(), query.includeSubUnits(),
                query.positionId(), query.status(), query.sort(), query.nationality(), query.skillId(),
                query.minSkillLevel(), query.page(), query.size());

        Map<UUID, OrgUnitSummary> units = unitsById();
        Map<UUID, CatalogItemRef> positions = positions(page.getContent());
        EffectiveManagers managers = EffectiveManagers.of(page.getContent(), units, employees::findAllById);
        return PageResponse.of(page, employee -> toItem(employee, units, positions, managers));
    }

    /**
     * One page of the Employees within the scope that pass the list filters, in the list's order. Shared by the
     * list and the Excel export, so both always show the same rows. Checks every filter value
     * ({@code validation.invalid}) but not the paging.
     */
    Page<Employee> matching(AccessScope scope, String q, UUID orgUnitId, boolean includeSubUnits, UUID positionId,
            String status, String sort, int page, int size) {
        return matching(scope, q, orgUnitId, includeSubUnits, positionId, status, sort, null, page, size);
    }

    Page<Employee> matching(AccessScope scope, String q, UUID orgUnitId, boolean includeSubUnits, UUID positionId,
            String status, String sort, String nationality, int page, int size) {
        return matching(scope, q, orgUnitId, includeSubUnits, positionId, status, sort, nationality,
                null, null, page, size);
    }

    Page<Employee> matching(AccessScope scope, String q, UUID orgUnitId, boolean includeSubUnits, UUID positionId,
            String status, String sort, String nationality, UUID skillId, Integer minSkillLevel, int page, int size) {
        Sort order = sort(sort);
        Specification<Employee> filter = EmployeeSpecifications.matching(search(q),
                orgUnitIds(orgUnitId, includeSubUnits), positionId,
                statuses(status, ACTIVE), null);
        String country = EmployeeComplianceRules.nationality(nationality);
        if (country != null) {
            filter = filter.and(EmployeeSpecifications.byNationality(country));
        }
        if (skillId == null && minSkillLevel != null) throw invalid("skillId");
        if (skillId != null) {
            if (minSkillLevel != null && (minSkillLevel < 1 || minSkillLevel > 5)) throw invalid("minSkillLevel");
            if (catalogService.findItem(Catalog.SKILL, skillId).isEmpty()) throw invalid("skillId");
            filter = filter.and(EmployeeSpecifications.bySkill(skillId, minSkillLevel == null ? 1 : minSkillLevel));
        }
        AccessScope.EmployeeFilter visible = scope.employeeFilter();
        if (!visible.all()) {
            filter = filter.and(EmployeeSpecifications.withinScope(visible.orgUnitIds(), visible.selfEmployeeId()));
        }
        return employees.findAll(filter, PageRequest.of(page, size, order));
    }

    /**
     * Employees to pick from (Quản lý trực tiếp, unit head, the Account's Employee), by name. The whole company
     * whatever the data scope: only directory data, which the org chart shows anyway.
     */
    @Transactional(readOnly = true)
    public PageResponse<EmployeeOption> options(CurrentAccount caller, EmployeeOptionsQuery query) {
        AccessScope scope = accessScopes.scopeOf(caller);
        if (!scope.has(Permission.EMPLOYEE_VIEW) && !scope.has(Permission.ORG_EDIT)
                && !scope.has(Permission.ACCOUNT_EDIT)) {
            scope.require(Permission.EMPLOYEE_VIEW);
        }
        requirePage(query.page(), query.size(), MAX_OPTIONS_SIZE);
        Specification<Employee> filter = EmployeeSpecifications.matching(search(query.q()),
                orgUnitIds(query.orgUnitId(), query.includeSubUnits()), null, statuses(query.status(), ACTIVE),
                query.excludeId());
        Page<Employee> page = employees.findAll(filter, PageRequest.of(query.page(), query.size(),
                Sort.by("searchText", "code")));

        Map<UUID, OrgUnitSummary> units = unitsById();
        Map<UUID, CatalogItemRef> positions = positions(page.getContent());
        return PageResponse.of(page, employee -> {
            OrgUnitSummary unit = employee.getOrgUnitId() == null ? null : units.get(employee.getOrgUnitId());
            CatalogItemRef position = positions.get(employee.getPositionId());
            return new EmployeeOption(employee.getId(), employee.getCode(), employee.getFullName(),
                    employee.getStatus().name(), unit == null ? null : unit.name(),
                    position == null ? null : position.name());
        });
    }

    /**
     * Active Employees by name or code, as list rows name them ("NV00021 · Nhóm Web"), for a person picker that every
     * Employee may use (the delegate of an Ủy quyền duyệt). No permission check: the caller checks who may ask.
     */
    @Transactional(readOnly = true)
    public List<EmployeeCard> activeCards(String q, UUID excludeId, int limit) {
        Specification<Employee> filter = EmployeeSpecifications.matching(search(q), null, null, ACTIVE, excludeId);
        List<Employee> found = employees.findAll(filter, PageRequest.of(0, limit, Sort.by("searchText", "code")))
                .getContent();
        Map<UUID, OrgUnitSummary> units = unitsById();
        return found.stream().map(e -> {
            OrgUnitSummary unit = e.getOrgUnitId() == null ? null : units.get(e.getOrgUnitId());
            return new EmployeeCard(e.getId(), e.getCode(), e.getFullName(), unit == null ? null : unit.name());
        }).toList();
    }

    /**
     * Every active Employee by name who passes the filters, as the rows of a company-wide view (the resource
     * heatmap). No permission check and no paging: the caller checks who may ask and the company is small.
     */
    @Transactional(readOnly = true)
    public List<EmployeeCard> allActiveCards(String q, UUID orgUnitId, boolean includeSubUnits) {
        Specification<Employee> filter = EmployeeSpecifications.matching(search(q),
                orgUnitIds(orgUnitId, includeSubUnits), null, ACTIVE, null);
        List<Employee> found = employees.findAll(filter, Sort.by("searchText", "code"));
        Map<UUID, OrgUnitSummary> units = unitsById();
        return found.stream().map(e -> {
            OrgUnitSummary unit = e.getOrgUnitId() == null ? null : units.get(e.getOrgUnitId());
            return new EmployeeCard(e.getId(), e.getCode(), e.getFullName(), unit == null ? null : unit.name());
        }).toList();
    }

    private EmployeeListItem toItem(Employee employee, Map<UUID, OrgUnitSummary> units,
            Map<UUID, CatalogItemRef> positions, EffectiveManagers managers) {
        EmployeeUnitRef orgUnit = null;
        OrgUnitSummary unit = employee.getOrgUnitId() == null ? null : units.get(employee.getOrgUnitId());
        if (unit != null) {
            OrgUnitSummary parent = unit.parentId() == null ? null : units.get(unit.parentId());
            orgUnit = new EmployeeUnitRef(unit.id(), unit.code(), unit.name(), unit.active(),
                    parent == null ? null : parent.name());
        }
        CatalogItemRef item = positions.get(employee.getPositionId());
        AssignmentRef position = item == null ? null
                : new AssignmentRef(item.id(), item.code(), item.name(), item.active());
        EmployeeRef manager = managers.of(employee).map(EmployeeService::toRef).orElse(null);
        return new EmployeeListItem(employee.getId(), employee.getCode(), employee.getFullName(),
                employee.getStatus().name(), orgUnit, position, manager, employee.getHireDate(), employee.getPhone(),
                employee.getPersonalEmail());
    }

    private Map<UUID, OrgUnitSummary> unitsById() {
        return orgUnitService.summaries().stream()
                .collect(Collectors.toMap(OrgUnitSummary::id, Function.identity()));
    }

    private Map<UUID, CatalogItemRef> positions(Collection<Employee> page) {
        return catalogService.findItems(Catalog.POSITION,
                page.stream().map(Employee::getPositionId).collect(Collectors.toSet()));
    }

    /** Null: no unit filter. The unit alone, or with every unit below it; an unknown unit matches nobody. */
    private Set<UUID> orgUnitIds(UUID orgUnitId, boolean includeSubUnits) {
        if (orgUnitId == null) {
            return null;
        }
        return includeSubUnits ? orgUnitService.selfAndDescendants(orgUnitId) : Set.of(orgUnitId);
    }

    static void requirePage(int page, int size, int maxSize) {
        if (page < 0) {
            throw invalid("page");
        }
        if (size < 1 || size > maxSize) {
            throw invalid("size");
        }
    }

    /** A LIKE pattern, or null when there is nothing to search for (also a term of only spaces or accents). */
    static String search(String q) {
        if (q != null && q.length() > MAX_SEARCH_LENGTH) {
            throw invalid("q");
        }
        return q == null || SearchText.of(q).isEmpty() ? null : SearchText.containsPattern(q);
    }

    /** Comma-separated status names; {@code whenEmpty} when none is given. */
    static Set<EmployeeStatus> statuses(String value, Set<EmployeeStatus> whenEmpty) {
        if (value != null && "ALL".equals(value.trim())) return EnumSet.allOf(EmployeeStatus.class);
        Set<EmployeeStatus> statuses = EnumSet.noneOf(EmployeeStatus.class);
        if (value != null) {
            for (String part : value.split(",")) {
                String name = part.trim();
                if (name.isEmpty()) {
                    continue;
                }
                statuses.add(Arrays.stream(EmployeeStatus.values())
                        .filter(status -> status.name().equals(name))
                        .findFirst()
                        .orElseThrow(() -> invalid("status")));
            }
        }
        return statuses.isEmpty() ? whenEmpty : statuses;
    }

    /** {@code key} or {@code key,asc|desc}; the code breaks ties, so pages do not overlap. */
    static Sort sort(String value) {
        String[] parts = StringUtils.hasText(value) ? value.trim().split(",", -1) : new String[] {"code"};
        String property = SORT_PROPERTIES.get(parts[0].trim());
        String direction = parts.length > 1 ? parts[1].trim().toLowerCase(Locale.ROOT) : "asc";
        if (property == null || parts.length > 2 || !(direction.equals("asc") || direction.equals("desc"))) {
            throw invalid("sort");
        }
        Sort primary = Sort.by(direction.equals("desc") ? Sort.Direction.DESC : Sort.Direction.ASC, property);
        return property.equals("code") ? primary : primary.and(Sort.by(Sort.Direction.ASC, "code"));
    }

    private static ApiException invalid(String field) {
        return new ApiException(HttpStatus.BAD_REQUEST, "validation.invalid", "Request value is invalid: " + field)
                .with("errors", List.of(Map.of("field", field, "code", "invalid")));
    }
}
