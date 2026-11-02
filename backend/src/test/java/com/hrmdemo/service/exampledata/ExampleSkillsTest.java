package com.hrmdemo.service.exampledata;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

import com.hrmdemo.service.exampledata.ExampleSkills.ExampleSkill;
import org.junit.jupiter.api.Test;

/** The example skills are consistent with the example company and the default catalog, so the seeder skips nothing. */
class ExampleSkillsTest {

    private static final Set<String> PEOPLE = ExampleEmployees.EMPLOYEES.stream()
            .map(ExampleEmployees.ExampleEmployee::fullName).collect(Collectors.toSet());

    private static final Set<String> SKILL_CODES = Set.of("JAVA", "SPRING_BOOT", "REACT", "TYPESCRIPT", "POSTGRESQL",
            "KIEM_THU", "PTNV", "QLDA", "TIENG_ANH", "TIENG_NHAT");

    @Test
    void everySkillNamesAKnownPersonAndADefaultSkillAtALevelFromOneToFive() {
        for (ExampleSkill skill : ExampleSkills.SKILLS) {
            assertThat(PEOPLE).as(skill.who()).contains(skill.who());
            assertThat(SKILL_CODES).as(skill.skillCode()).contains(skill.skillCode());
            assertThat(skill.level()).as(skill.who() + " " + skill.skillCode()).isBetween(1, 5);
        }
    }

    @Test
    void aPersonHasASkillOnlyOnce() {
        Set<String> seen = new HashSet<>();
        for (ExampleSkill skill : ExampleSkills.SKILLS) {
            assertThat(seen.add(skill.who() + "/" + skill.skillCode())).as(skill.who() + " " + skill.skillCode())
                    .isTrue();
        }
    }

    @Test
    void theEmployeesAndLeaveFlowsKeepTheirProfilesFree() {
        assertThat(ExampleSkills.SKILLS).extracting(ExampleSkill::who)
                .doesNotContain("Nguyễn Văn An", "Trần Thị Mai");
    }
}
