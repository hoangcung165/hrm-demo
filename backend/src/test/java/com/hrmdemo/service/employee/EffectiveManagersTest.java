package com.hrmdemo.service.employee;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hrmdemo.dto.orgunit.OrgUnitSummary;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.EmployeeIdentityFields;
import com.hrmdemo.entity.employee.EmployeeJobFields;
import com.hrmdemo.entity.employee.EmployeePersonalFields;
import com.hrmdemo.entity.employee.EmployeeStatus;
import com.hrmdemo.entity.employee.Gender;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

/** The effective manager of a whole list page, from one load: same rule as the profile. */
class EffectiveManagersTest {

    static final UUID BRANCH = UUID.fromString("00000000-0000-0000-0000-0000000000a1");
    static final UUID DEPARTMENT = UUID.fromString("00000000-0000-0000-0000-0000000000a2");
    static final UUID TEAM = UUID.fromString("00000000-0000-0000-0000-0000000000a3");

    final Employee director = employee("NV00001", BRANCH, null, EmployeeStatus.OFFICIAL);
    final Employee head = employee("NV00002", DEPARTMENT, null, EmployeeStatus.OFFICIAL);
    final Employee chosen = employee("NV00003", null, null, EmployeeStatus.OFFICIAL);
    final Map<UUID, OrgUnitSummary> units = Map.of(
            BRANCH, new OrgUnitSummary(BRANCH, null, "HN", "Chi nhánh Hà Nội", true, director.getId()),
            DEPARTMENT, new OrgUnitSummary(DEPARTMENT, BRANCH, "ENG", "Phòng Kỹ thuật", false, head.getId()),
            TEAM, new OrgUnitSummary(TEAM, DEPARTMENT, "WEB", "Nhóm Web", true, null));
    final List<Collection<UUID>> loads = new ArrayList<>();

    @Test
    void everyRowIsResolvedFromOneLoadOfTheCandidates() {
        Employee member = employee("NV00010", TEAM, null, EmployeeStatus.PROBATION);
        Employee assigned = employee("NV00011", TEAM, chosen.getId(), EmployeeStatus.OFFICIAL);
        Employee underTheCompany = employee("NV00012", null, null, EmployeeStatus.OFFICIAL);

        EffectiveManagers managers = EffectiveManagers.of(List.of(member, assigned, head, director, underTheCompany),
                units, this::load);

        assertThat(loads).hasSize(1);
        assertThat(loads.get(0)).containsExactlyInAnyOrder(director.getId(), head.getId(), chosen.getId());
        // Inactive units count: their people are still there.
        assertThat(managers.of(member)).containsSame(head);
        assertThat(managers.of(assigned)).containsSame(chosen);
        assertThat(managers.of(head)).containsSame(director);
        assertThat(managers.of(director)).isEmpty();
        assertThat(managers.of(underTheCompany)).isEmpty();
    }

    @Test
    void anInactiveHeadIsSkippedAndNothingIsLoadedWhenThereIsNoCandidate() {
        ReflectionTestUtils.setField(head, "status", EmployeeStatus.INACTIVE);
        Employee member = employee("NV00010", TEAM, null, EmployeeStatus.PROBATION);

        assertThat(EffectiveManagers.of(List.of(member), units, this::load).of(member)).containsSame(director);

        loads.clear();
        Employee underTheCompany = employee("NV00012", null, null, EmployeeStatus.OFFICIAL);
        EffectiveManagers.of(List.of(underTheCompany), units, this::load);
        assertThat(loads).isEmpty();
    }

    private List<Employee> load(Collection<UUID> ids) {
        loads.add(List.copyOf(ids));
        return List.of(director, head, chosen).stream().filter(e -> ids.contains(e.getId())).toList();
    }

    private static Employee employee(String code, UUID orgUnitId, UUID managerId, EmployeeStatus status) {
        Employee employee = new Employee(code,
                new EmployeePersonalFields("Person " + code, LocalDate.of(1990, 1, 1), Gender.MALE, null, null, null,
                        null, null, null),
                new EmployeeIdentityFields("079190000" + code.substring(code.length() - 3), null, null, null, null),
                new EmployeeJobFields(orgUnitId, UUID.randomUUID(), managerId, LocalDate.of(2020, 1, 1), status),
                Instant.parse("2026-10-06T08:00:00Z"));
        ReflectionTestUtils.setField(employee, "id", UUID.randomUUID());
        return employee;
    }
}
