package com.hrmdemo.controller.auth;

import com.hrmdemo.dto.auth.MeResponse;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.auth.AuthService;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class MeController {

    private final AuthService authService;

    @GetMapping("/api/me")
    MeResponse me(@Parameter(hidden = true) CurrentAccount account) {
        return authService.me(account.id());
    }
}
