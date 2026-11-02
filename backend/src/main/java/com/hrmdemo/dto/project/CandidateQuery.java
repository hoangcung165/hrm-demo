package com.hrmdemo.dto.project;

import java.time.LocalDate;

/**
 * What a Tìm người search asks for, as the query string gave it.
 *
 * @param skills required skills as {@code <skillId>:<minLevel>} separated by commas, one to five
 * @param from   first day of the range; null: today, or the project's first day when that is later
 * @param to     last day of the range; null: the project's last day
 * @param need   Cần phân bổ, 1 to 100; null: not given
 * @param sort   {@code match} (default) or {@code free}
 * @param page   from 0
 * @param size   1 to 100
 */
public record CandidateQuery(String skills, LocalDate from, LocalDate to, Integer need, String sort, int page,
        int size) {
}
