package com.hrmdemo.repository.employee;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyChar;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.EmployeeStatus;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/** The scope part of the list query: units the caller heads plus itself, and nobody when it has neither. */
class EmployeeSpecificationsTest {

    static final UUID UNIT = UUID.fromString("00000000-0000-0000-0000-0000000000a1");
    static final UUID SELF = UUID.fromString("00000000-0000-0000-0000-0000000000e1");

    @SuppressWarnings("unchecked")
    final Root<Employee> root = mock(Root.class);
    final CriteriaQuery<?> query = mock(CriteriaQuery.class);
    final CriteriaBuilder cb = mock(CriteriaBuilder.class);

    final Predicate nobody = mock(Predicate.class);
    final Predicate inUnits = mock(Predicate.class);
    final Predicate isSelf = mock(Predicate.class);
    final Predicate either = mock(Predicate.class);
    final Predicate all = mock(Predicate.class);

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        Path<Object> orgUnitId = mock(Path.class);
        Path<Object> id = mock(Path.class);
        Path<Object> status = mock(Path.class);
        Path<Object> searchText = mock(Path.class);
        when(root.get("orgUnitId")).thenReturn(orgUnitId);
        when(root.get("id")).thenReturn(id);
        when(root.get("status")).thenReturn(status);
        when(root.get("searchText")).thenReturn(searchText);
        when(orgUnitId.in(any(java.util.Collection.class))).thenReturn(inUnits);
        when(cb.equal(id, SELF)).thenReturn(isSelf);
        when(cb.disjunction()).thenReturn(nobody);
        when(cb.or(any(Predicate[].class))).thenReturn(either);
        when(cb.and(any(Predicate[].class))).thenReturn(all);
    }

    @Test
    void aCallerWithNeitherUnitsNorAnEmployeeOfItsOwnSeesNobody() {
        assertThat(EmployeeSpecifications.withinScope(Set.of(), null).toPredicate(root, query, cb)).isSameAs(nobody);
    }

    @Test
    void aLineManagerSeesTheirUnitsAndThemselves() {
        assertThat(EmployeeSpecifications.withinScope(Set.of(UNIT), SELF).toPredicate(root, query, cb))
                .isSameAs(either);

        ArgumentCaptor<Predicate[]> parts = ArgumentCaptor.forClass(Predicate[].class);
        verify(cb).or(parts.capture());
        assertThat(parts.getValue()).containsExactly(inUnits, isSelf);
    }

    @Test
    void anEmployeeWithoutUnitsSeesOnlyThemselves() {
        EmployeeSpecifications.withinScope(Set.of(), SELF).toPredicate(root, query, cb);

        ArgumentCaptor<Predicate[]> parts = ArgumentCaptor.forClass(Predicate[].class);
        verify(cb).or(parts.capture());
        assertThat(parts.getValue()).containsExactly(isSelf);
        verify(cb, never()).disjunction();
    }

    @Test
    void aUnitFilterThatMatchesNoUnitMatchesNobodyAndMissingFiltersAreLeftOut() {
        EmployeeSpecifications.matching(null, Set.of(), null, Set.of(), null).toPredicate(root, query, cb);

        ArgumentCaptor<Predicate[]> parts = ArgumentCaptor.forClass(Predicate[].class);
        verify(cb).and(parts.capture());
        assertThat(parts.getValue()).containsExactly(nobody);
        verify(cb, never()).like(any(), anyString(), anyChar());
    }

    @Test
    @SuppressWarnings("unchecked")
    void everyGivenFilterIsApplied() {
        Predicate like = mock(Predicate.class);
        Predicate statuses = mock(Predicate.class);
        when(cb.like(any(Expression.class), anyString(), anyChar())).thenReturn(like);
        when(root.get("status").in(any(java.util.Collection.class))).thenReturn(statuses);

        EmployeeSpecifications.matching("%mai%", List.of(UNIT), null, Set.of(EmployeeStatus.OFFICIAL), null)
                .toPredicate(root, query, cb);

        ArgumentCaptor<Predicate[]> parts = ArgumentCaptor.forClass(Predicate[].class);
        verify(cb).and(parts.capture());
        assertThat(parts.getValue()).containsExactly(like, inUnits, statuses);
    }
}
