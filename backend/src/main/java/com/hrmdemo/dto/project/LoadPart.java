package com.hrmdemo.dto.project;

import java.util.UUID;

/**
 * One project's share of a period of Tải phân bổ.
 *
 * @param thisProject whether it is the project being looked at (or the allocation being tried)
 */
public record LoadPart(UUID projectId, String projectCode, String projectName, int percent, boolean thisProject) {
}
