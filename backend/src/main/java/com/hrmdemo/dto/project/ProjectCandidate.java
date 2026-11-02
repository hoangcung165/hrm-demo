package com.hrmdemo.dto.project;

import java.util.List;

/**
 * One person Tìm người found.
 *
 * @param matched     how many required skills they meet
 * @param required    how many were asked for
 * @param skills      every required skill against them, in the order asked
 * @param peakLoad    their highest Tải phân bổ in the range, across every project
 * @param freePercent % còn trống: 100 minus {@code peakLoad}, not below 0
 * @param overloaded  {@code peakLoad} is above 100
 * @param months      the highest load of each month of the range
 */
public record ProjectCandidate(CandidatePerson employee, int matched, int required, List<CandidateSkill> skills,
        int peakLoad, int freePercent, boolean overloaded, List<CandidateMonth> months,
        List<CandidateLeave> approvedLeave) {
}
