package com.hrmdemo.dto.project;

import java.util.UUID;

/** A Dự án an Employee is allocated to, with its PM: what other features (leave notices) need to know. */
public record ProjectOfEmployee(UUID id, String code, String name, UUID pmEmployeeId) {
}
