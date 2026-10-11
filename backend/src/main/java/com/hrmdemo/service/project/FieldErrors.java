package com.hrmdemo.service.project;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.hrmdemo.exception.ApiException;
import org.springframework.http.HttpStatus;

/**
 * Every failing field of a request, reported at once as {@code validation.invalid} with {@code errors: [{field, code}]}.
 * Only the first error of a field counts.
 */
final class FieldErrors {

    private final List<Map<String, String>> list = new ArrayList<>();
    private final Set<String> fields = new HashSet<>();

    void add(String field, String code) {
        if (fields.add(field)) {
            list.add(Map.of("field", field, "code", code));
        }
    }

    boolean has(String field) {
        return fields.contains(field);
    }

    void throwIfAny() {
        if (!list.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "validation.invalid", "Request values are invalid")
                    .with("errors", List.copyOf(list));
        }
    }
}
