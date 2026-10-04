package com.hrmdemo.exception;

import java.util.List;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

/**
 * All API errors are ProblemDetail (RFC 9457) with a {@code code} field.
 * Ordered first so it wins over Spring Boot's own ProblemDetail advice, which has no {@code code}.
 */
@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    ProblemDetail handleApi(ApiException ex) {
        var problem = ProblemDetail.forStatusAndDetail(ex.getStatus(), ex.getMessage());
        problem.setProperty("code", ex.getCode());
        ex.getProperties().forEach(problem::setProperty);
        return problem;
    }

    /** A body that is not JSON, or a value of the wrong type in it (e.g. a malformed id). */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ProblemDetail handleUnreadableBody(HttpMessageNotReadableException ex) {
        return invalid("Request body is missing or malformed");
    }

    /** A path or query value of the wrong type, e.g. a malformed id in the URL. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ProblemDetail handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return invalid("Request parameter is malformed");
    }

    private static ProblemDetail invalid(String detail) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, detail);
        problem.setProperty("code", "validation.invalid");
        problem.setProperty("errors", List.of());
        return problem;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Dữ liệu không hợp lệ");
        problem.setProperty("code", "validation.invalid");
        List<FieldError> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> new FieldError(e.getField(), e.getCode()))
                .toList();
        problem.setProperty("errors", errors);
        return problem;
    }

    /** Fallback for upload endpoints without their own size error; see CompanyController for the logo. */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ProblemDetail handleUploadTooLarge(MaxUploadSizeExceededException ex) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.valueOf(413), "Uploaded file is too large");
        problem.setProperty("code", "upload.too_large");
        return problem;
    }

    record FieldError(String field, String code) {
    }
}
