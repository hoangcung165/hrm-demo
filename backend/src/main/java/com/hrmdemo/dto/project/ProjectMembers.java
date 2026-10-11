package com.hrmdemo.dto.project;

/**
 * Who works on a project, from its Phân bổ.
 *
 * @param running    Employees with an allocation that covers today
 * @param upcoming   Employees whose allocation starts later and who have none today
 * @param overloaded Employees among both who are Quá tải somewhere within their allocation, from today on
 */
public record ProjectMembers(int running, int upcoming, int overloaded) {

    public static final ProjectMembers NONE = new ProjectMembers(0, 0, 0);
}
