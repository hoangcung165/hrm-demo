package com.hrmdemo.service.exampledata;

import java.time.Clock;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.catalog.CatalogItemRef;
import com.hrmdemo.dto.project.AllocationRequest;
import com.hrmdemo.dto.project.ProjectRequest;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.entity.catalog.Catalog;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.approval.ApprovalRequestService;
import com.hrmdemo.service.catalog.CatalogService;
import com.hrmdemo.service.project.AllocationService;
import com.hrmdemo.service.project.ProjectService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * The example Dự án and Phân bổ of the approved {@code #15} artboards, so the project screens open filled. The dates
 * are relative to today, so the projects are always running or about to start. Vũ Thị Lan (PM persona) manages DA-031
 * and DA-029; Lương Văn Hiển manages DA-027, the "another PM's project" case. Cao Minh Trí is 60% on DA-029 until day
 * 21 and 60% on DA-031 from day 4, so both projects show one Quá tải member (120% between day 4 and day 21).
 * <p>
 * The resource views (HRM-17) have more to show: DA-025 ends on day 16 with five people on it, one of whom has
 * nothing after it (Sắp hết dự án, "Chưa có phân bổ tiếp theo"), one starts DA-033 on day 20 and one stays on DA-027;
 * Đoàn Minh Tuấn is 40% on DA-027 until day 50 and 70% on DA-033 from day 20, so he is 110% next month (a Quá tải
 * that is not yet there today); and most of the company has no allocation, which is the Bench.
 * <p>
 * Everything goes through the services as a system caller with every project right, as an Admin would do it. A
 * person or unit that is missing leaves out what depends on it. {@code web/e2e/projects-flow.mjs} relies on these
 * projects, the four allocations it lists itself and on Cao Minh Trí and Đoàn Minh Tuấn being the only people Quá
 * tải; {@code web/e2e/resources-flow.mjs} on the endings of DA-025.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "hrm.example-data.enabled", havingValue = "true")
@RequiredArgsConstructor
class ExampleProjects {

    /** @param unitCode example unit that owns it; {@code from} and {@code to} are days from today */
    record ExampleProject(String code, String name, String client, String pm, String unitCode, int from, int to,
            String status, Long laborBudget) {
    }

    /** @param roleCode code of a default Vai trò dự án */
    record ExampleAllocation(String project, String who, String roleCode, int percent, int from, int to) {
    }

    static final List<ExampleProject> PROJECTS = List.of(
            new ExampleProject("DA-031", "Ứng dụng đặt lịch khám", "Bệnh viện Đa khoa Tâm An", "Vũ Thị Lan", "PTPM",
                    -40, 170, "ACTIVE", 2_400_000_000L),
            new ExampleProject("DA-029", "Cổng khách hàng bảo hiểm", "Bảo hiểm Hướng Dương", "Vũ Thị Lan", "PTPM",
                    -120, 60, "ACTIVE", null),
            new ExampleProject("DA-027", "Hệ thống bán hàng tại quầy", "Bán lẻ Lúa Vàng", "Lương Văn Hiển", "PMDN",
                    -160, 50, "ACTIVE", null),
            new ExampleProject("DA-025", "Triển khai ERP", "Vận tải Biển Xanh", "Lương Văn Hiển", "PMDN", -150, 16,
                    "ACTIVE", null),
            new ExampleProject("DA-033", "Nền tảng dữ liệu nội bộ", null, "Hoàng Gia Huy", "PTPM", 20, 200, "PLANNED",
                    null),
            new ExampleProject("DA-018", "Ứng dụng hội viên", "Bán lẻ Lúa Vàng", "Lương Văn Hiển", "PMDN", -430, -100,
                    "CLOSED", null));

    static final List<ExampleAllocation> ALLOCATIONS = List.of(
            // DA-031: five running, two starting later (Trí and Quỳnh), two ended.
            new ExampleAllocation("DA-031", "Vũ Thị Lan", "PM", 50, -40, 170),
            new ExampleAllocation("DA-031", "Cao Minh Trí", "DEV", 60, 4, 80),
            new ExampleAllocation("DA-031", "Tô Thị Bích Ngọc", "DEV", 100, -40, 170),
            new ExampleAllocation("DA-031", "Lưu Đức Mạnh", "DEVOPS", 30, -40, 80),
            new ExampleAllocation("DA-031", "Quách Văn Long", "QA", 50, -12, 170),
            new ExampleAllocation("DA-031", "Dương Thị Hạnh", "UI_UX", 40, -40, 48),
            new ExampleAllocation("DA-031", "Mạc Thị Quỳnh", "DEV", 100, 19, 170),
            new ExampleAllocation("DA-031", "Hoàng Gia Huy", "BA", 50, -40, -14),
            new ExampleAllocation("DA-031", "Ngô Thanh Sơn", "BA", 20, -40, -26),
            // DA-029: Trí is shared with DA-031.
            new ExampleAllocation("DA-029", "Vũ Thị Lan", "PM", 50, -100, 60),
            new ExampleAllocation("DA-029", "Cao Minh Trí", "DEV", 60, -100, 21),
            new ExampleAllocation("DA-029", "Kiều Văn Thành", "DEV", 100, -100, 60),
            new ExampleAllocation("DA-029", "Châu Thị Thanh Tâm", "BA", 50, -100, 60),
            new ExampleAllocation("DA-029", "Phạm Thị Lan Anh", "QA", 100, -60, 60),
            // DA-027: Phan Khánh Duy has 30% here, which the e2e flow adds to.
            new ExampleAllocation("DA-027", "Lương Văn Hiển", "PM", 50, -150, 50),
            new ExampleAllocation("DA-027", "Phan Khánh Duy", "DEV", 30, -150, 50),
            new ExampleAllocation("DA-027", "La Văn Khải", "DEV", 100, -150, 50),
            new ExampleAllocation("DA-027", "Đoàn Minh Tuấn", "TECH_LEAD", 40, -150, 50),
            new ExampleAllocation("DA-027", "Thái Văn Bình", "DEV", 50, -150, 50),
            // DA-025 ends on day 16: Hòa and Cường have nothing after it, Minh starts DA-033 on day 20, Bình stays on
            // DA-027 and Hiển on DA-027 as PM.
            new ExampleAllocation("DA-025", "Lương Văn Hiển", "PM", 30, -150, 16),
            new ExampleAllocation("DA-025", "Trần Đức Hòa", "DEV", 100, -150, 16),
            new ExampleAllocation("DA-025", "Võ Mạnh Cường", "BA", 100, -100, 16),
            new ExampleAllocation("DA-025", "Hà Quang Minh", "QA", 60, -150, 12),
            new ExampleAllocation("DA-025", "Thái Văn Bình", "DEV", 50, -150, 9),
            // DA-033 has not started. Tuấn is 40% on DA-027 until day 50, so 110% from day 20 to day 50.
            new ExampleAllocation("DA-033", "Châu Thị Thanh Tâm", "BA", 50, 20, 200),
            new ExampleAllocation("DA-033", "Hà Quang Minh", "QA", 50, 20, 200),
            new ExampleAllocation("DA-033", "Đoàn Minh Tuấn", "TECH_LEAD", 70, 20, 60));

    private final ProjectService projects;
    private final AllocationService allocations;
    private final CatalogService catalogService;
    private final Clock clock;

    /**
     * @param employeeIds the example Employees by full name
     * @param unitIds     the example units by code
     * @return how many projects were added
     */
    int seed(Map<String, UUID> employeeIds, Map<String, UUID> unitIds) {
        LocalDate today = LocalDate.ofInstant(clock.instant(), ApprovalRequestService.COMPANY_ZONE);
        CurrentAccount system = new CurrentAccount(null, null, Set.of(Role.ADMIN.name()));
        Map<String, UUID> projectIds = new HashMap<>();
        for (ExampleProject project : PROJECTS) {
            UUID pm = employeeIds.get(project.pm());
            UUID unit = unitIds.get(project.unitCode());
            if (pm == null || unit == null) {
                log.warn("Example project {} skipped: no {} or no unit {}", project.code(), project.pm(),
                        project.unitCode());
                continue;
            }
            projectIds.put(project.code(), projects.create(system, new ProjectRequest(project.code(), project.name(),
                    project.client(), pm, unit, today.plusDays(project.from()), today.plusDays(project.to()),
                    project.status(), project.laborBudget())).id());
        }
        Map<String, Optional<UUID>> roles = new HashMap<>();
        int allocated = 0;
        for (ExampleAllocation allocation : ALLOCATIONS) {
            UUID project = projectIds.get(allocation.project());
            UUID who = employeeIds.get(allocation.who());
            Optional<UUID> role = roles.computeIfAbsent(allocation.roleCode(),
                    code -> catalogService.findItemByCode(Catalog.PROJECT_ROLE, code).filter(CatalogItemRef::active)
                            .map(CatalogItemRef::id));
            if (project == null || who == null || role.isEmpty()) {
                log.warn("Example allocation of {} on {} skipped: a person, project or role is missing",
                        allocation.who(), allocation.project());
                continue;
            }
            this.allocations.create(system, project, new AllocationRequest(who, role.get(), allocation.percent(),
                    today.plusDays(allocation.from()), today.plusDays(allocation.to())));
            allocated++;
        }
        log.info("Example data: {} projects with {} allocations", projectIds.size(), allocated);
        return projectIds.size();
    }
}
