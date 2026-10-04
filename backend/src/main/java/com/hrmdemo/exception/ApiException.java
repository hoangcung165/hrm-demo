package com.hrmdemo.exception;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Business error returned to the client. {@code code} is a stable key (e.g. {@code auth.invalid_credentials})
 * that the frontend translates (vi/en); the backend never returns translated text.
 * Facts the message needs (a count, the unit that holds a code) travel as extra properties of the problem body.
 */
@Getter
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final Map<String, Object> properties = new LinkedHashMap<>();

    public ApiException(HttpStatus status, String code, String detail) {
        super(detail);
        this.status = status;
        this.code = code;
    }

    /** Adds a top-level field to the problem body, next to {@code code}. */
    public ApiException with(String name, Object value) {
        properties.put(name, value);
        return this;
    }

    public Map<String, Object> getProperties() {
        return Collections.unmodifiableMap(properties);
    }
}
