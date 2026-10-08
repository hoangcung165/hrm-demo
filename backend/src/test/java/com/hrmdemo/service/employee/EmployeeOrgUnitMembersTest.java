package com.hrmdemo.service.employee;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.dto.catalog.CatalogItemRef;
import com.hrmdemo.dto.orgunit.OrgUnitHead;
import com.hrmdemo.dto.orgunit.OrgUnitSummary;
import com.hrmdemo.entity.catalog.Catalog;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.EmployeeIdentityFields;
import com.hrmdemo.entity.employee.EmployeeJobFields;
import com.hrmdemo.entity.employee.EmployeePersonalFields;
import com.hrmdemo.entity.employee.EmployeeStatus;
import com.hrmdemo.entity.employee.Gender;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.service.catalog.CatalogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

/** Unit heads, headcounts and the manager-cycle walk for a new head, from the employee table. */
@ExtendWith(MockitoExtension.class)
class EmployeeOrgUnitMembersTest {

    static final Instant NOW = Instant.parse("2026-10-08T08:00:00Z");
    static final UUID DEPARTMENT = UUID.fromString("00000000-0000-0000-0000-0000000000a1");
    static final UUID TEAM = UUID.fromString("00000000-0000-0000-0000-0000000000a2");
    static final UUID POSITION = UUID.fromString("00000000-0000-0000-0000-0000000000c1");

    @Mock
    EmployeeRepository employees;
    @Mock
    CatalogService catalogService;

    EmployeeOrgUnitMembers members;

    @BeforeEach
    void setUp() {
        members = new EmployeeOrgUnitMembers(employees, catalogService);
        lenient().when(catalogService.findItems(any(), anyCollection()))
                .thenReturn(Map.of(POSITION, new CatalogItemRef(POSITION, "TN", "Trưởng nhóm", true)));
    }

    @Test
    void headcountsAreActiveEmployeesPerUnitAndDeletingLooksAtEveryStatus() {
        List<Object[]> rows = new ArrayList<>();
        rows.add(new Object[] {TEAM, 3L});
        when(employees.countActiveByOrgUnit()).thenReturn(rows);
        when(employees.countByStatusNot(EmployeeStatus.INACTIVE)).thenReturn(5L);
        when(employees.countByOrgUnitId(TEAM)).thenReturn(4L);

        assertThat(members.headcountByOrgUnit()).containsExactly(Map.entry(TEAM, 3L));
        assertThat(members.companyHeadcount()).isEqualTo(5);
        assertThat(members.countAssigned(TEAM)).isEqualTo(4);
    }

    @Test
    void onlyAnActiveEmployeeMayBecomeHeadAndIsShownWithCodeAndPosition() {
        Employee active = stored("NV00007", TEAM, null, EmployeeStatus.OFFICIAL);
        Employee left = stored("NV00008", TEAM, null, EmployeeStatus.INACTIVE);

        assertThat(members.findHead(active.getId())).contains(
                new OrgUnitHead(active.getId(), "Lê Văn Hùng", "NV00007", "Trưởng nhóm", null));
        assertThat(members.findHead(left.getId())).isEmpty();
        assertThat(members.findHead(UUID.randomUUID())).isEmpty();
    }

    @Test
    void aHeadWhoReportsToAMemberOfTheUnitTheyWouldHeadClosesALoop() {
        // The member follows the unit head; the candidate reports by choice to the member.
        Employee member = stored("NV00010", TEAM, null, EmployeeStatus.OFFICIAL);
        Employee candidate = stored("NV00011", DEPARTMENT, member.getId(), EmployeeStatus.OFFICIAL);

        assertThat(members.closesManagerCycle(candidate.getId(), units(null, candidate.getId()))).isTrue();
    }

    @Test
    void aHeadWhoseChainEndsElsewhereIsFine() {
        Employee member = stored("NV00010", TEAM, null, EmployeeStatus.OFFICIAL);
        Employee boss = stored("NV00001", null, null, EmployeeStatus.OFFICIAL);
        Employee candidate = stored("NV00011", TEAM, boss.getId(), EmployeeStatus.OFFICIAL);

        assertThat(members.closesManagerCycle(candidate.getId(), units(null, candidate.getId()))).isFalse();
        // A head of its own unit skips that unit and follows the department's head, who has no manager.
        Employee follower = stored("NV00012", TEAM, null, EmployeeStatus.OFFICIAL);
        assertThat(members.closesManagerCycle(follower.getId(), units(boss.getId(), follower.getId()))).isFalse();
        // But with a member of the team as the department's head, the two would follow each other.
        assertThat(members.closesManagerCycle(follower.getId(), units(member.getId(), follower.getId()))).isTrue();
    }

    @Test
    void anInactiveHeadOnTheWayIsSkippedLikeTheDefaultManagerRuleDoes() {
        Employee left = stored("NV00002", TEAM, null, EmployeeStatus.INACTIVE);
        Employee member = stored("NV00010", TEAM, null, EmployeeStatus.OFFICIAL);
        // The candidate would head the department and reports to the member, whose team head has left.
        Employee candidate = stored("NV00011", null, member.getId(), EmployeeStatus.OFFICIAL);

        assertThat(members.closesManagerCycle(candidate.getId(), units(candidate.getId(), left.getId()))).isTrue();
    }

    private static List<OrgUnitSummary> units(UUID departmentHead, UUID teamHead) {
        return List.of(new OrgUnitSummary(DEPARTMENT, null, "ENG", "Phòng Kỹ thuật", true, departmentHead),
                new OrgUnitSummary(TEAM, DEPARTMENT, "WEB", "Nhóm Web", true, teamHead));
    }

    private Employee stored(String code, UUID orgUnitId, UUID managerId, EmployeeStatus status) {
        Employee employee = new Employee(code,
                new EmployeePersonalFields("Lê Văn Hùng", LocalDate.of(1990, 6, 18), Gender.MALE, null, null, null,
                        null, null, null),
                new EmployeeIdentityFields("040090123456", null, null, null, null),
                new EmployeeJobFields(orgUnitId, POSITION, managerId, LocalDate.of(2020, 1, 1), status), NOW);
        ReflectionTestUtils.setField(employee, "id", UUID.randomUUID());
        lenient().when(employees.findById(employee.getId())).thenReturn(Optional.of(employee));
        return employee;
    }
}
