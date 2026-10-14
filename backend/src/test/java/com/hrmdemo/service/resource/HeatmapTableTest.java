package com.hrmdemo.service.resource;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hrmdemo.dto.employee.EmployeeCard;
import com.hrmdemo.service.allocation.AllocationCalculator;
import com.hrmdemo.service.allocation.EmployeeLoad;
import com.hrmdemo.service.allocation.PlannedAllocation;
import com.hrmdemo.service.allocation.AllocationCalculator.Granularity;
import com.hrmdemo.service.resource.HeatmapTable.Row;
import com.hrmdemo.service.resource.HeatmapTable.Sort;
import com.hrmdemo.service.resource.ResourceThresholds.Level;
import org.junit.jupiter.api.Test;

/**
 * The people of the approved #17 artboards. Today is Wednesday 14/10/2026, the first column the week of 12/10.
 * Cao Minh Trí: 60% on DA-029 until 31/10 and 60% on DA-031 from 14/10, so 120% until 31/10, then 60%.
 */
class HeatmapTableTest {

    static final LocalDate MONDAY = LocalDate.of(2026, 10, 12);
    static final HeatmapWindow WEEKS = HeatmapWindow.of(Granularity.WEEK, MONDAY, 4);
    static final UUID DA_029 = UUID.randomUUID();
    static final UUID DA_031 = UUID.randomUUID();

    EmployeeCard tri = card("NV00031", "Cao Minh Trí");
    EmployeeCard an = card("NV00001", "Nguyễn Văn An");
    EmployeeCard anh = card("NV00002", "Ân Thị Hoa");
    EmployeeCard thanh = card("NV00003", "Kiều Văn Thành");

    Map<UUID, EmployeeLoad> loads = loads(
            planned(tri, DA_029, 60, "2026-07-06", "2026-10-31"),
            planned(tri, DA_031, 60, "2026-10-14", "2026-12-31"),
            planned(thanh, DA_029, 100, "2026-07-06", "2026-10-31"),
            planned(anh, DA_031, 40, "2026-10-26", "2026-12-31"));

    @Test
    void aCellIsTheHighestLoadOfItsWeekSoAMidWeekStartShows() {
        List<Row> rows = HeatmapTable.rows(List.of(tri), loads, WEEKS);

        // Week of 12/10: 60% on Monday and Tuesday, 120% from Wednesday. Weeks of 19/10, 26/10: 120%.
        // Week of 02/11: only DA-031.
        assertThat(rows.get(0).cells()).containsExactly(120, 120, 120, 60);
        assertThat(rows.get(0).peak()).isEqualTo(120);
        assertThat(rows.get(0).overloaded()).isTrue();
    }

    @Test
    void somebodyWithoutAllocationsHasARowOfZeros() {
        List<Row> rows = HeatmapTable.rows(List.of(an), loads, WEEKS);

        assertThat(rows.get(0).cells()).containsExactly(0, 0, 0, 0);
        assertThat(rows.get(0).peak()).isZero();
        assertThat(rows.get(0).overloaded()).isFalse();
    }

    @Test
    void exactlyOneHundredPercentIsNotOverloaded() {
        List<Row> rows = HeatmapTable.rows(List.of(thanh), loads, WEEKS);

        assertThat(rows.get(0).cells()).containsExactly(100, 100, 100, 0);
        assertThat(rows.get(0).overloaded()).isFalse();
    }

    @Test
    void theLevelFilterUsesThePeakOfTheWindowAndTheThresholdsInForce() {
        List<Row> rows = HeatmapTable.rows(List.of(tri, an, anh, thanh), loads, WEEKS);
        ResourceThresholds defaults = ResourceThresholds.DEFAULTS;

        assertThat(names(HeatmapTable.onLevel(rows, defaults, Level.OVER))).containsExactly("Cao Minh Trí");
        assertThat(names(HeatmapTable.onLevel(rows, defaults, Level.FULL))).containsExactly("Kiều Văn Thành");
        assertThat(names(HeatmapTable.onLevel(rows, defaults, Level.BENCH))).containsExactly("Nguyễn Văn An",
                "Ân Thị Hoa");
        assertThat(HeatmapTable.onLevel(rows, defaults, Level.PARTIAL)).isEmpty();
        assertThat(HeatmapTable.onLevel(rows, defaults, null)).hasSize(4);

        // With a bench threshold of 30%, a peak of 40% is partial.
        ResourceThresholds own = new ResourceThresholds(30, 90, 4);
        assertThat(names(HeatmapTable.onLevel(rows, own, Level.PARTIAL))).containsExactly("Ân Thị Hoa");
    }

    @Test
    void rowsAreSortedByLoadOrByNameAndTiesGoByName() {
        List<Row> rows = HeatmapTable.rows(List.of(tri, an, anh, thanh), loads, WEEKS);

        assertThat(names(HeatmapTable.sorted(rows, Sort.LOAD_DESC))).containsExactly("Cao Minh Trí",
                "Kiều Văn Thành", "Ân Thị Hoa", "Nguyễn Văn An");
        assertThat(names(HeatmapTable.sorted(rows, Sort.LOAD_ASC))).containsExactly("Nguyễn Văn An", "Ân Thị Hoa",
                "Kiều Văn Thành", "Cao Minh Trí");
        // Accents do not move a name: Ân sorts with the As.
        assertThat(names(HeatmapTable.sorted(rows, Sort.NAME))).containsExactly("Ân Thị Hoa", "Cao Minh Trí",
                "Kiều Văn Thành", "Nguyễn Văn An");
    }

    static List<String> names(List<Row> rows) {
        return rows.stream().map(row -> row.employee().fullName()).toList();
    }

    static EmployeeCard card(String code, String name) {
        return new EmployeeCard(UUID.randomUUID(), code, name, "Nhóm Web");
    }

    static PlannedAllocation planned(EmployeeCard person, UUID project, int percent, String from, String to) {
        return new PlannedAllocation(UUID.randomUUID(), person.id(), project, percent, LocalDate.parse(from),
                LocalDate.parse(to));
    }

    static Map<UUID, EmployeeLoad> loads(PlannedAllocation... allocations) {
        return new AllocationCalculator().loads(List.of(allocations), MONDAY, MONDAY.plusDays(60));
    }
}
