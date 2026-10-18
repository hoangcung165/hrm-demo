package com.hrmdemo.dto.employee;

import java.time.LocalDate;
import java.util.List;

public record UpcomingExpiriesResponse(List<UpcomingExpiryItem> items, long total, int page, int size,
        LocalDate asOf) {}
