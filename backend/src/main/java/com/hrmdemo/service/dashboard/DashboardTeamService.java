package com.hrmdemo.service.dashboard;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.dashboard.TeamResponse;
import com.hrmdemo.dto.employee.EmployeeCard;
import com.hrmdemo.dto.resource.HeatmapResponse;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.EmployeeStatus;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.repository.employee.EmployeeSpecifications;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.allocation.AllocationCalculator.Granularity;
import com.hrmdemo.service.approval.ApprovalRequestService;
import com.hrmdemo.service.employee.EmployeeService;
import com.hrmdemo.service.leave.LeaveCalendarService;
import com.hrmdemo.service.leave.LeaveCalendarService.TeamLeave;
import com.hrmdemo.service.resource.HeatmapWindow;
import com.hrmdemo.service.resource.ResourceHeatmapService;
import com.hrmdemo.service.resource.ResourceSettingsService;
import com.hrmdemo.service.resource.ResourceThresholds;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * "Nhóm của tôi" on the Tổng quan page (HRM-20) for a Quản lý trực tiếp: the active members of the units the caller
 * heads and the units below, each with this week's Tải phân bổ and the leave that is coming. An Account that heads no
 * unit has no team (403). The load is the Heatmap's own cell of the week.
 */
@Service
@RequiredArgsConstructor
public class DashboardTeamService {

    /** How far ahead "upcoming leave" looks. */
    static final int LEAVE_DAYS_AHEAD = 30;

    private static final Set<EmployeeStatus> ACTIVE = EnumSet.of(EmployeeStatus.PROBATION, EmployeeStatus.OFFICIAL);

    private final EmployeeRepository employees;
    private final EmployeeService employeeCards;
    private final ResourceHeatmapService heatmap;
    private final ResourceSettingsService settings;
    private final LeaveCalendarService leave;
    private final AccessScopeService accessScopes;
    private final Clock clock;

    @Transactional(readOnly = true)
    public TeamResponse team(CurrentAccount caller) {
        AccessScope scope = accessScopes.scopeOf(caller);
        if (scope.orgUnitIds().isEmpty()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "auth.forbidden", "Access is denied");
        }
        LocalDate today = LocalDate.ofInstant(clock.instant(), ApprovalRequestService.COMPANY_ZONE);
        HeatmapWindow week = HeatmapWindow.of(Granularity.WEEK, today, 1);

        List<UUID> ids = employees.findAll(EmployeeSpecifications.matching(null, scope.orgUnitIds(), null, ACTIVE,
                scope.employeeId()), Sort.by("searchText", "id")).stream().map(Employee::getId).toList();
        Map<UUID, EmployeeCard> cards = employeeCards.cards(ids);
        List<EmployeeCard> people = ids.stream().map(cards::get).filter(card -> card != null).toList();
        Map<UUID, Integer> loads = heatmap.weekPeaks(people, today);
        Map<UUID, List<TeamLeave>> leaves = leave.approvedOf(ids, today, today.plusDays(LEAVE_DAYS_AHEAD));

        List<TeamResponse.Member> members = people.stream()
                .map(card -> new TeamResponse.Member(card, loads.getOrDefault(card.id(), 0),
                        leaves.getOrDefault(card.id(), List.of()).stream()
                                .map(l -> new TeamResponse.Leave(l.leaveType(), l.startDate(), l.endDate())).toList()))
                .sorted(Comparator.comparing((TeamResponse.Member member) -> member.employee().fullName())
                        .thenComparing(member -> member.employee().code()))
                .toList();
        ResourceThresholds thresholds = settings.current();
        return new TeamResponse(week.from(), week.to(), new HeatmapResponse.Thresholds(thresholds.benchPercent(),
                thresholds.nearFullPercent(), thresholds.endingWeeks()), members);
    }
}
