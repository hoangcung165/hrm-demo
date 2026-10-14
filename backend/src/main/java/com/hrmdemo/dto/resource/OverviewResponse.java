package com.hrmdemo.dto.resource;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.dto.employee.EmployeeCard;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The Nguồn lực dashboard for one week and the 12 weeks from it. People are every active Employee of the department
 * filter; project counts are company-wide.
 *
 * @param weekFrom Monday of the week shown
 * @param weekTo   Sunday of that week
 */
public record OverviewResponse(LocalDate weekFrom, LocalDate weekTo, Tiles tiles, Levels thisWeek,
        List<WeekLevels> weeks, List<ProjectStaff> projects, Attention attention, HeatmapResponse.Thresholds thresholds) {

    /**
     * @param projectsRunning  projects with status ACTIVE
     * @param projectsPlanned  projects with status PLANNED
     * @param projectsOnHold   projects with status ON_HOLD
     * @param projectStaff     people with at least one allocation in the week
     * @param people           active Employees in scope (the resource pool)
     * @param averageLoad      average Tải phân bổ of {@code projectStaff} only, or null when nobody is allocated
     * @param bench            people whose highest load in the week is under the bench threshold
     * @param overloadedNow    people above 100% on some day of the week
     * @param overloadedIn12Weeks people above 100% on some day of the 12 weeks
     * @param endingSoon       allocations ending within the ending-soon setting
     */
    public record Tiles(int projectsRunning, int projectsPlanned, int projectsOnHold, int projectStaff, int people,
            @Schema(nullable = true) Integer averageLoad, int bench, int overloadedNow, int overloadedIn12Weeks,
            int endingSoon) {
    }

    /** People per level for the week (highest load of the week). */
    public record Levels(int bench, int partial, int full, int over) {
    }

    /** People per level for one week of the 12. */
    public record WeekLevels(LocalDate from, LocalDate to, Levels levels) {
    }

    /**
     * A running project's staffing in the week.
     *
     * @param headcount  distinct people allocated in the week
     * @param fte        full-time equivalents: the allocation percentages added up, divided by 100
     * @param overloaded of those people, how many are above 100% in the week
     * @param upcoming   people with an allocation on it that starts after the week, within the 12 weeks
     */
    public record ProjectStaff(UUID projectId, String code, String name, int headcount, double fte, int overloaded,
            int upcoming) {
    }

    /** What needs a look: the most overloaded people and the earliest endings. */
    public record Attention(List<Overloaded> overloaded, List<EndingEntry> ending) {
    }

    /**
     * @param peak      the highest load within the 12 weeks
     * @param from      first day of their first overloaded period
     * @param to        last day of that period
     * @param projects  codes of the projects that add up to the overload in that period
     */
    public record Overloaded(EmployeeCard employee, int peak, LocalDate from, LocalDate to, List<String> projects) {
    }

    public record EndingEntry(EmployeeCard employee, AllocationBrief allocation, int daysLeft, int loadAfter,
            boolean withoutNext) {
    }
}
