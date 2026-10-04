package com.hrmdemo.dto;

import java.util.List;
import java.util.function.Function;

import org.springframework.data.domain.Page;

/** Common list response: {@code { items, total }}. */
public record PageResponse<T>(List<T> items, long total) {

    public static <E, T> PageResponse<T> of(Page<E> page, Function<E, T> mapper) {
        return new PageResponse<>(page.map(mapper).getContent(), page.getTotalElements());
    }
}
