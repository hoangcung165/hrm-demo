package com.hrmdemo.repository.employee;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.EmployeeStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

/** Filters of the employee list and picker. The Legal entity filter is added by Hibernate. */
public final class EmployeeSpecifications {

    private EmployeeSpecifications() {
    }

    /**
     * Employees that pass every given filter; a null filter is left out.
     *
     * @param searchPattern LIKE pattern (see {@code SearchText.containsPattern}) over the full name and the code,
     *                      with {@code \} as the escape character
     * @param orgUnitIds    Employees of these units; an empty collection matches nobody
     * @param statuses      Employees with one of these statuses; an empty collection is left out
     * @param excludeId     an Employee to leave out
     */
    public static Specification<Employee> matching(String searchPattern, Collection<UUID> orgUnitIds, UUID positionId,
            Collection<EmployeeStatus> statuses, UUID excludeId) {
        return (root, query, cb) -> {
            List<Predicate> filters = new ArrayList<>();
            if (searchPattern != null) {
                filters.add(cb.like(root.<String>get("searchText"), searchPattern, '\\'));
            }
            if (orgUnitIds != null) {
                filters.add(orgUnitIds.isEmpty() ? cb.disjunction() : root.get("orgUnitId").in(orgUnitIds));
            }
            if (positionId != null) {
                filters.add(cb.equal(root.get("positionId"), positionId));
            }
            if (statuses != null && !statuses.isEmpty()) {
                filters.add(root.get("status").in(statuses));
            }
            if (excludeId != null) {
                filters.add(cb.notEqual(root.get("id"), excludeId));
            }
            return cb.and(filters.toArray(Predicate[]::new));
        };
    }

    /**
     * The data scope of a caller without company scope (Phạm vi truy cập): the Employees of the given units,
     * plus the caller's own Employee. Nobody when both are missing. Employees without a unit match only as self.
     *
     * @param orgUnitIds     the units the caller heads and every unit below them
     * @param selfEmployeeId the caller's own Employee, or null
     */
    public static Specification<Employee> withinScope(Collection<UUID> orgUnitIds, UUID selfEmployeeId) {
        return (root, query, cb) -> {
            List<Predicate> visible = new ArrayList<>();
            if (!orgUnitIds.isEmpty()) {
                visible.add(root.get("orgUnitId").in(orgUnitIds));
            }
            if (selfEmployeeId != null) {
                visible.add(cb.equal(root.get("id"), selfEmployeeId));
            }
            return visible.isEmpty() ? cb.disjunction() : cb.or(visible.toArray(Predicate[]::new));
        };
    }
}
