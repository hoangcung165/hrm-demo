package com.hrmdemo.dto.employee;

import java.util.Map;

/** All five warning windows are replaced together; days must be between zero and 365. */
public record ExpiryPolicyRequest(Map<ExpiryType, Integer> advanceDays) {}
