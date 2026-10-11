package com.hrmdemo.dto.project;

import java.util.UUID;

/** The Phòng ban phụ trách of a Dự án, as lists name it. */
public record ProjectUnitRef(UUID id, String name, boolean active) {
}
