package com.hrmdemo.dto.project;

import java.util.List;

/**
 * The result of Tìm người.
 *
 * @param total          people who meet at least one required skill and are not left out
 * @param excludedMembers the project's members in the range, who are left out (they are edited from the members table)
 */
public record ProjectCandidatesResponse(long total, int excludedMembers, int page, int size,
        List<ProjectCandidate> items) {
}
