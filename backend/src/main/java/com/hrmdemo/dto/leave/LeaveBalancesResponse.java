package com.hrmdemo.dto.leave;

import java.time.LocalDate;
import java.util.List;

import com.hrmdemo.dto.employee.EmployeeCard;

/**
 * Số dư phép of an Employee for every active Loại nghỉ (and any inactive one with days that year).
 *
 * @param asOf the company's today: what has accrued so far
 */
public record LeaveBalancesResponse(EmployeeCard employee, int year, LocalDate asOf, List<LeaveBalanceItem> items) {
}
