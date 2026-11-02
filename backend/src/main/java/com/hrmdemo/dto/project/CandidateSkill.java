package com.hrmdemo.dto.project;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * One required skill against the Employee.
 *
 * @param level the Employee's level in it (1 to 5); null when they do not have the skill
 * @param met   they have it at {@code minLevel} or above
 */
public record CandidateSkill(UUID skillId, String name, @Schema(nullable = true) Integer level, int minLevel,
        boolean met) {
}
