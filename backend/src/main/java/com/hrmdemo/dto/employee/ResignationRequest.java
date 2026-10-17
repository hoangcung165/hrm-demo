package com.hrmdemo.dto.employee;

import java.time.LocalDate;

public record ResignationRequest(LocalDate lastWorkingDay, String reason) {}
