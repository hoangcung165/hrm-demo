package com.hrmdemo.dto.employee;

import java.util.Map;

public record ExpiryPolicyResponse(Map<ExpiryType, Integer> advanceDays, boolean canEdit) {}
