package com.hrmdemo.service.orgunit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.entity.orgunit.OrgUnit;
import com.hrmdemo.entity.orgunit.OrgUnitType;
import com.hrmdemo.repository.orgunit.OrgUnitRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

/** Which units a Trưởng đơn vị manages for the Access scope: the units they head and every unit below. */
class HeadedOrgUnitsTest {

    static final Instant NOW = Instant.parse("2026-10-05T08:00:00Z");
    static final UUID MANAGER = UUID.fromString("00000000-0000-0000-0000-0000000000e1");
    static final UUID SOMEONE_ELSE = UUID.fromString("00000000-0000-0000-0000-0000000000e2");

    /** What the repository holds. */
    final List<OrgUnit> stored = new ArrayList<>();
    final OrgUnitRepository orgUnits = mock(OrgUnitRepository.class);
    final HeadedOrgUnits headedOrgUnits = new HeadedOrgUnits(orgUnits);

    @BeforeEach
    void setUp() {
        when(orgUnits.findAll()).thenReturn(stored);
    }

    @Test
    void aHeadManagesTheirUnitAndEveryUnitBelowAtAnyDepth() {
        OrgUnit branch = unit(null, "CNDN", SOMEONE_ELSE);
        OrgUnit department = unit(branch.getId(), "PMDN", MANAGER);
        OrgUnit team = unit(department.getId(), "WEBDN", SOMEONE_ELSE);
        OrgUnit subTeam = unit(team.getId(), "WEBDN-1", null);
        OrgUnit sibling = unit(branch.getId(), "KTDN", null);

        assertThat(headedOrgUnits.unitIdsManagedBy(MANAGER))
                .containsExactlyInAnyOrder(department.getId(), team.getId(), subTeam.getId())
                .doesNotContain(branch.getId(), sibling.getId());
    }

    @Test
    void inactiveUnitsCountBecauseTheirEmployeesAreStillThere() {
        OrgUnit department = unit(null, "PTPM", MANAGER);
        OrgUnit closedTeam = unit(department.getId(), "GAME", null);
        closedTeam.deactivate(NOW);
        OrgUnit closedUnitOfTheManager = unit(null, "OLD", MANAGER);
        closedUnitOfTheManager.deactivate(NOW);

        assertThat(headedOrgUnits.unitIdsManagedBy(MANAGER))
                .containsExactlyInAnyOrder(department.getId(), closedTeam.getId(), closedUnitOfTheManager.getId());
    }

    @Test
    void aHeadOfTwoUnitsManagesBothSubtreesAndAUnitIsListedOnce() {
        OrgUnit department = unit(null, "PTPM", MANAGER);
        // Also head of a team inside their own department: the team must not show up twice.
        OrgUnit teamInside = unit(department.getId(), "WEB", MANAGER);
        OrgUnit otherDepartment = unit(null, "DVKH", MANAGER);
        OrgUnit teamOfOther = unit(otherDepartment.getId(), "TK", null);
        OrgUnit unrelated = unit(null, "KD", SOMEONE_ELSE);

        assertThat(headedOrgUnits.unitIdsManagedBy(MANAGER))
                .containsExactlyInAnyOrder(department.getId(), teamInside.getId(), otherDepartment.getId(),
                        teamOfOther.getId())
                .doesNotContain(unrelated.getId());
    }

    @Test
    void anEmployeeWhoHeadsNothingManagesNoUnit() {
        unit(null, "PTPM", SOMEONE_ELSE);
        unit(null, "DVKH", null);

        assertThat(headedOrgUnits.unitIdsManagedBy(MANAGER)).isEmpty();
    }

    @Test
    void aCompanyWithoutUnitsHasNothingToManage() {
        assertThat(headedOrgUnits.unitIdsManagedBy(MANAGER)).isEmpty();
    }

    private OrgUnit unit(UUID parentId, String code, UUID headEmployeeId) {
        OrgUnit unit = new OrgUnit(parentId, code, "Unit " + code, OrgUnitType.DEPARTMENT, headEmployeeId, 0, NOW);
        ReflectionTestUtils.setField(unit, "id", UUID.randomUUID());
        stored.add(unit);
        return unit;
    }
}
