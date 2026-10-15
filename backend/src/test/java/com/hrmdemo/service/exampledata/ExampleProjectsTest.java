package com.hrmdemo.service.exampledata;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hrmdemo.service.exampledata.ExampleProjects.ExampleAllocation;
import com.hrmdemo.service.exampledata.ExampleProjects.ExampleProject;
import org.junit.jupiter.api.Test;

/** The example projects are consistent with the example company, so the seeder never meets a missing reference. */
class ExampleProjectsTest {

    private static final Set<String> ROLES = Set.of("PM", "TECH_LEAD", "BA", "DEV", "QA", "UI_UX", "DEVOPS");

    private static final Set<String> PEOPLE = ExampleEmployees.EMPLOYEES.stream()
            .map(ExampleEmployees.ExampleEmployee::fullName).collect(Collectors.toSet());

    private static final Map<String, ExampleProject> BY_CODE = ExampleProjects.PROJECTS.stream()
            .collect(Collectors.toMap(ExampleProject::code, Function.identity()));

    @Test
    void everyProjectHasAKnownPmUnitAndOrderedDates() {
        Set<String> units = ExampleDataSeeder.UNITS.stream().map(ExampleDataSeeder.ExampleUnit::code)
                .collect(Collectors.toSet());
        assertThat(BY_CODE).hasSameSizeAs(ExampleProjects.PROJECTS);
        for (ExampleProject project : ExampleProjects.PROJECTS) {
            assertThat(PEOPLE).as(project.code()).contains(project.pm());
            assertThat(units).as(project.code()).contains(project.unitCode());
            assertThat(project.to()).as(project.code()).isGreaterThanOrEqualTo(project.from());
        }
    }

    @Test
    void everyAllocationFitsItsProjectAndNamesAKnownPersonAndRole() {
        Set<String> seen = new HashSet<>();
        for (ExampleAllocation a : ExampleProjects.ALLOCATIONS) {
            ExampleProject project = BY_CODE.get(a.project());
            assertThat(project).as(a.project()).isNotNull();
            assertThat(PEOPLE).as(a.who()).contains(a.who());
            assertThat(ROLES).as(a.roleCode()).contains(a.roleCode());
            assertThat(a.percent()).isBetween(1, 100);
            assertThat(a.from()).as(a.who() + " on " + a.project()).isGreaterThanOrEqualTo(project.from())
                    .isLessThanOrEqualTo(a.to());
            assertThat(a.to()).as(a.who() + " on " + a.project()).isLessThanOrEqualTo(project.to());
            // One allocation per person and project, as the API requires for overlapping days.
            assertThat(seen.add(a.project() + "/" + a.who())).as(a.who() + " twice on " + a.project()).isTrue();
        }
    }

    @Test
    void onlyCaoMinhTriAndDoanMinhTuanAreOverloaded() {
        // Day by day over the whole range: who is above 100% on some day, counting every project, and when.
        Map<String, int[]> overloaded = new java.util.HashMap<>();
        for (int day = -200; day <= 250; day++) {
            Map<String, Integer> load = new java.util.HashMap<>();
            for (ExampleAllocation a : ExampleProjects.ALLOCATIONS) {
                if (day >= a.from() && day <= a.to()) {
                    load.merge(a.who(), a.percent(), Integer::sum);
                }
            }
            int today = day;
            load.forEach((who, percent) -> {
                if (percent > 100) {
                    int[] range = overloaded.computeIfAbsent(who, key -> new int[] {today, today});
                    range[1] = today;
                }
            });
        }
        // Trí's overlap is now to day 21; Tuấn's is next month, so it is not there today.
        assertThat(overloaded).containsOnlyKeys("Cao Minh Trí", "Đoàn Minh Tuấn");
        assertThat(overloaded.get("Cao Minh Trí")).containsExactly(4, 21);
        assertThat(overloaded.get("Đoàn Minh Tuấn")).containsExactly(20, 50);
    }

    @Test
    void da025EndsWithinFourWeeksAndLeavesSomeoneWithNothingAfterIt() {
        int ends = BY_CODE.get("DA-025").to();
        assertThat(ends).isBetween(1, 28);
        Map<String, Integer> loadAfter = new java.util.HashMap<>();
        ExampleProjects.ALLOCATIONS.stream().filter(a -> a.project().equals("DA-025")).forEach(a -> {
            assertThat(a.to()).as(a.who()).isLessThanOrEqualTo(ends);
            int after = ExampleProjects.ALLOCATIONS.stream().filter(b -> b.who().equals(a.who()))
                    .filter(b -> b.from() <= a.to() + 1 && b.to() >= a.to() + 1).mapToInt(ExampleAllocation::percent)
                    .sum();
            loadAfter.put(a.who(), after);
        });
        // Two people with no allocation the day after, so "Chưa có phân bổ tiếp theo" shows; and some who go on.
        assertThat(loadAfter.values().stream().filter(load -> load == 0).count()).isGreaterThanOrEqualTo(2);
        assertThat(loadAfter.values().stream().filter(load -> load > 0).count()).isGreaterThanOrEqualTo(1);
    }

    @Test
    void theMembersOfDa031AreRunningStartingLaterAndEnded() {
        List<ExampleAllocation> members = ExampleProjects.ALLOCATIONS.stream()
                .filter(a -> a.project().equals("DA-031")).toList();
        assertThat(members.stream().filter(a -> a.from() <= 0 && a.to() >= 0)).hasSize(5);
        assertThat(members.stream().filter(a -> a.from() > 0)).hasSize(2);
        assertThat(members.stream().filter(a -> a.to() < 0)).hasSize(2);
    }
}
