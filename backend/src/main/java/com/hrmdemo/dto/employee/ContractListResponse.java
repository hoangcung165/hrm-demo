package com.hrmdemo.dto.employee;

import java.time.LocalDate;
import java.util.List;

public record ContractListResponse(List<ContractListItem> items, long total, int page, int size, LocalDate asOf) {}
