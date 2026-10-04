package com.hrmdemo.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Business error returned to the client. {@code code} is a stable key (e.g. {@code auth.invalid_credentials})
 * that the frontend translates (vi/en); the backend never returns translated text.
 */
@Getter
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public ApiException(HttpStatus status, String code, String detail) {
        super(detail);
        this.status = status;
        this.code = code;
    }
}
