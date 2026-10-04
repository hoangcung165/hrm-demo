package com.hrmdemo.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Lỗi nghiệp vụ trả về client. {@code code} là khóa ổn định (ví dụ {@code auth.invalid_credentials})
 * để frontend tra câu thông báo vi/en; backend không trả câu đã dịch.
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
