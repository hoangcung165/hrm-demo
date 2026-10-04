package com.hrmdemo.controller.auth;

import java.util.Locale;

import com.hrmdemo.dto.auth.ChangePasswordRequest;
import com.hrmdemo.dto.auth.ForgotPasswordRequest;
import com.hrmdemo.dto.auth.ResetPasswordRequest;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.auth.PasswordService;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class PasswordController {

    private static final Locale VIETNAMESE = Locale.of("vi");

    private final PasswordService passwordService;

    /** Needs a JWT. Signs the Account out everywhere; the client has to sign in again. */
    @PostMapping("/change-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void changePassword(@Parameter(hidden = true) CurrentAccount account,
            @Valid @RequestBody ChangePasswordRequest request) {
        passwordService.changePassword(account.id(), request);
    }

    /**
     * Always 204. The email is in English when {@code Accept-Language} starts with {@code en}, else in Vietnamese
     * (also when the header is missing, whatever the server's own locale is).
     */
    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void forgotPassword(@Valid @RequestBody ForgotPasswordRequest request,
            @RequestHeader(name = HttpHeaders.ACCEPT_LANGUAGE, required = false) String acceptLanguage) {
        boolean english = acceptLanguage != null && acceptLanguage.trim().toLowerCase(Locale.ROOT).startsWith("en");
        passwordService.forgotPassword(request.email(), english ? Locale.ENGLISH : VIETNAMESE);
    }

    @PostMapping("/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordService.resetPassword(request);
    }
}
