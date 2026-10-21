package com.hrmdemo.dto.shift;

/** How many people the call covered and how many Phân ca it removed. */
public record ShiftClearResult(int employees, int removed) {
}
