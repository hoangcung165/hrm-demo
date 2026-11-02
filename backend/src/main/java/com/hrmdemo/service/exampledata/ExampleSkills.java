package com.hrmdemo.service.exampledata;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.catalog.CatalogItemRef;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.entity.catalog.Catalog;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.catalog.CatalogService;
import com.hrmdemo.service.employee.EmployeeQualificationsService;
import com.hrmdemo.service.employee.EmployeeQualificationsService.SkillRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * The example Kỹ năng (skill and level 1 to 5) of the people who staff projects, so Tìm người (HRM-16) has something
 * to find. The search for React and TypeScript from level 3 on DA-031 (the approved {@code #16} artboards) returns six
 * people from the Web, Web Đà Nẵng and Mobile teams, who are not members of DA-031:
 * <ul>
 * <li>meeting both: Lê Văn Hùng (free), Phan Khánh Duy (70% free) and Đoàn Minh Tuấn (110% next month, Quá tải);</li>
 * <li>meeting one: La Văn Khải (TypeScript only at level 2, and 100% busy), Kiều Văn Thành (no React) and
 * Đỗ Thị Thu Hằng (no TypeScript);</li>
 * <li>left out: Nguyễn Thị Hồng Nhung and Ông Thị Diễm My, whose levels are below 3.</li>
 * </ul>
 * Nguyễn Văn An and Trần Thị Mai have none: the leave and employee flows use their profiles. A person or skill that
 * is missing leaves the row out.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "hrm.example-data.enabled", havingValue = "true")
@RequiredArgsConstructor
class ExampleSkills {

    /** @param skillCode code of a default Kỹ năng ({@code CatalogDefaults}); {@code level} is 1 to 5 */
    record ExampleSkill(String who, String skillCode, int level) {
    }

    static final List<ExampleSkill> SKILLS = List.of(
            // The artboard search: React and TypeScript from level 3.
            new ExampleSkill("Lê Văn Hùng", "REACT", 5),
            new ExampleSkill("Lê Văn Hùng", "TYPESCRIPT", 4),
            new ExampleSkill("Phan Khánh Duy", "REACT", 4),
            new ExampleSkill("Phan Khánh Duy", "TYPESCRIPT", 3),
            new ExampleSkill("Đoàn Minh Tuấn", "REACT", 5),
            new ExampleSkill("Đoàn Minh Tuấn", "TYPESCRIPT", 5),
            new ExampleSkill("Đoàn Minh Tuấn", "SPRING_BOOT", 3),
            new ExampleSkill("La Văn Khải", "REACT", 3),
            new ExampleSkill("La Văn Khải", "TYPESCRIPT", 2),
            new ExampleSkill("Kiều Văn Thành", "TYPESCRIPT", 4),
            new ExampleSkill("Đỗ Thị Thu Hằng", "REACT", 3),
            new ExampleSkill("Nguyễn Thị Hồng Nhung", "REACT", 2),
            new ExampleSkill("Nguyễn Thị Hồng Nhung", "TYPESCRIPT", 2),
            new ExampleSkill("Ông Thị Diễm My", "REACT", 1),
            // Members of DA-031 and DA-029, who are left out of its search but show on other projects.
            new ExampleSkill("Cao Minh Trí", "REACT", 4),
            new ExampleSkill("Cao Minh Trí", "TYPESCRIPT", 4),
            new ExampleSkill("Tô Thị Bích Ngọc", "REACT", 3),
            new ExampleSkill("Tô Thị Bích Ngọc", "TYPESCRIPT", 3),
            new ExampleSkill("Mạc Thị Quỳnh", "REACT", 3),
            // Back end, data and test.
            new ExampleSkill("Nguyễn Văn Khoa", "JAVA", 5),
            new ExampleSkill("Nguyễn Văn Khoa", "SPRING_BOOT", 5),
            new ExampleSkill("Nguyễn Văn Khoa", "QLDA", 4),
            new ExampleSkill("Trần Đức Hòa", "JAVA", 4),
            new ExampleSkill("Trần Đức Hòa", "SPRING_BOOT", 4),
            new ExampleSkill("Hoàng Gia Huy", "JAVA", 4),
            new ExampleSkill("Hoàng Gia Huy", "POSTGRESQL", 4),
            new ExampleSkill("Châu Thị Thanh Tâm", "POSTGRESQL", 5),
            new ExampleSkill("Lưu Đức Mạnh", "JAVA", 3),
            new ExampleSkill("Lưu Đức Mạnh", "POSTGRESQL", 4),
            new ExampleSkill("Quách Văn Long", "KIEM_THU", 5),
            new ExampleSkill("Phạm Thị Lan Anh", "KIEM_THU", 3),
            new ExampleSkill("Hà Quang Minh", "KIEM_THU", 4),
            new ExampleSkill("Võ Mạnh Cường", "PTNV", 4),
            new ExampleSkill("Vũ Thị Lan", "QLDA", 5),
            new ExampleSkill("Vũ Thị Lan", "TIENG_ANH", 4));

    private final EmployeeQualificationsService qualifications;
    private final CatalogService catalogService;

    /**
     * @param employeeIds the example Employees by full name
     * @return how many skills were added
     */
    int seed(Map<String, UUID> employeeIds) {
        CurrentAccount system = new CurrentAccount(null, null, Set.of(Role.ADMIN.name()));
        Map<String, Optional<UUID>> skills = new HashMap<>();
        int added = 0;
        for (ExampleSkill skill : SKILLS) {
            UUID who = employeeIds.get(skill.who());
            Optional<UUID> skillId = skills.computeIfAbsent(skill.skillCode(),
                    code -> catalogService.findItemByCode(Catalog.SKILL, code).filter(CatalogItemRef::active)
                            .map(CatalogItemRef::id));
            if (who == null || skillId.isEmpty()) {
                log.warn("Example skill {} of {} skipped: the person or the skill is missing", skill.skillCode(),
                        skill.who());
                continue;
            }
            qualifications.addSkill(system, who, new SkillRequest(skillId.get(), skill.level()));
            added++;
        }
        log.info("Example data: {} skills", added);
        return added;
    }
}
