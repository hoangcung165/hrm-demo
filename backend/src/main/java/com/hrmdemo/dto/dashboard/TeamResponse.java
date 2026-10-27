package com.hrmdemo.dto.dashboard;

import java.time.LocalDate;
import java.util.List;

import com.hrmdemo.dto.employee.EmployeeCard;
import com.hrmdemo.dto.leave.LeaveTypeRef;
import com.hrmdemo.dto.resource.HeatmapResponse;

/**
 * "Nhóm của tôi" for a Quản lý trực tiếp: the active members of the units they head and the units below, by name,
 * the manager left out.
 *
 * @param weekFrom   Monday of the week the loads are for
 * @param weekTo     Sunday of that week
 * @param thresholds the Ngưỡng nguồn lực, to level a load as the Heatmap does
 */
public record TeamResponse(LocalDate weekFrom, LocalDate weekTo, HeatmapResponse.Thresholds thresholds,
        List<Member> members) {

    /**
     * @param load          the highest Tải phân bổ of the person in the week, in percent: the Heatmap's cell of that
     *                      week
     * @param upcomingLeave approved leave that is going on or starts within the next 30 days, soonest first
     */
    public record Member(EmployeeCard employee, int load, List<Leave> upcomingLeave) {
    }

    /** First and last day the request counts. */
    public record Leave(LeaveTypeRef leaveType, LocalDate startDate, LocalDate endDate) {
    }
}
