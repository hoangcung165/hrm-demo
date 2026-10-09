package com.hrmdemo.service.approval;

import java.util.List;

import com.hrmdemo.dto.approval.ApprovalRequestType;
import com.hrmdemo.entity.auth.Role;

/**
 * The Luồng phê duyệt every company starts with, as drawn on "#12 Cấu hình luồng phê duyệt". A company that
 * saves its own flow for a type replaces the default for that type only.
 */
public final class ApprovalFlowDefaults {

    private ApprovalFlowDefaults() {
    }

    public static ApprovalFlow of(ApprovalRequestType type) {
        return switch (type) {
            case PROFILE_UPDATE -> new ApprovalFlow(type,
                    List.of(ApprovalLevel.lineManager(), ApprovalLevel.role(Role.HR)), 3, true);
            case LEAVE, ATTENDANCE_ADJUSTMENT -> new ApprovalFlow(type, List.of(ApprovalLevel.lineManager()), 3, true);
            // Overtime is paid: someone always decides.
            case OVERTIME -> new ApprovalFlow(type, List.of(ApprovalLevel.lineManager()), null, true);
            case TIMESHEET -> new ApprovalFlow(type, List.of(ApprovalLevel.projectManager()), 5, true);
            case PAYROLL -> new ApprovalFlow(type, List.of(ApprovalLevel.role(Role.HR),
                    ApprovalLevel.role(Role.ACCOUNTANT), ApprovalLevel.role(Role.DIRECTOR)), null, false);
        };
    }
}
