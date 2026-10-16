package com.hrmdemo.dto.leave;

import java.util.List;

import com.hrmdemo.dto.employee.EmployeeCard;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Who would approve the request first, from the Luồng phê duyệt "Nghỉ phép" (read-only on the form).
 *
 * @param autoApproveDays the flow's Tự duyệt delay; null when it never approves itself
 */
public record LeaveApproversPreview(int levelCount, List<EmployeeCard> firstLevel,
        @Schema(nullable = true) Integer autoApproveDays) {
}
