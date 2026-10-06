package com.hrmdemo.dto.catalog;

import java.util.List;

/** The years in which the company has a holiday, ascending. */
public record HolidayYearsResponse(List<Integer> years) {
}
