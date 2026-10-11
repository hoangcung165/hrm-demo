package com.hrmdemo.repository.project;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.entity.project.Project;
import com.hrmdemo.entity.project.ProjectStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

/** Filters of the project list. The Legal entity filter is added by Hibernate. */
public final class ProjectSpecifications {

    private ProjectSpecifications() {
    }

    /**
     * Projects that pass every given filter; a null filter is left out.
     *
     * @param searchPattern LIKE pattern (see {@code SearchText.containsPattern}) over code, name and client, with
     *                      {@code \} as the escape character
     * @param statuses      projects with one of these statuses
     * @param orgUnitIds    projects owned by one of these units; an empty collection matches nothing
     * @param pmEmployeeId  projects this Employee manages
     * @param ids           only these projects; an empty collection matches nothing
     */
    public static Specification<Project> matching(String searchPattern, Collection<ProjectStatus> statuses,
            Collection<UUID> orgUnitIds, UUID pmEmployeeId, Collection<UUID> ids) {
        return (root, query, cb) -> {
            List<Predicate> filters = new ArrayList<>();
            if (searchPattern != null) {
                filters.add(cb.like(root.<String>get("searchText"), searchPattern, '\\'));
            }
            if (statuses != null) {
                filters.add(statuses.isEmpty() ? cb.disjunction() : root.get("status").in(statuses));
            }
            if (orgUnitIds != null) {
                filters.add(orgUnitIds.isEmpty() ? cb.disjunction() : root.get("orgUnitId").in(orgUnitIds));
            }
            if (ids != null) {
                filters.add(ids.isEmpty() ? cb.disjunction() : root.get("id").in(ids));
            }
            if (pmEmployeeId != null) {
                filters.add(cb.equal(root.get("pmEmployeeId"), pmEmployeeId));
            }
            return cb.and(filters.toArray(Predicate[]::new));
        };
    }
}
