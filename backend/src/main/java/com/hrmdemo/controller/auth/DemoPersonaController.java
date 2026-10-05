package com.hrmdemo.controller.auth;

import com.hrmdemo.dto.auth.AccessTokenResponse;
import com.hrmdemo.dto.auth.DemoPersonasResponse;
import com.hrmdemo.dto.auth.DemoSignInRequest;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.auth.DemoPersonaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * "Demo as…". Exists only when {@code hrm.demo-personas.enabled} is true: with the flag off these paths are
 * not mapped at all and answer like any unknown path. They sit under {@code /api/auth} so the browser sends
 * the refresh cookie, but unlike the rest of {@code /api/auth} they need a JWT (see {@code SecurityConfig}).
 */
@RestController
@RequestMapping("/api/auth/demo")
@ConditionalOnProperty(name = "hrm.demo-personas.enabled", havingValue = "true")
@RequiredArgsConstructor
public class DemoPersonaController {

    private final DemoPersonaService demoPersonaService;
    private final RefreshCookies refreshCookies;

    @GetMapping("/personas")
    @Operation(summary = "The demo personas, one per role; available is false for a missing or locked one")
    DemoPersonasResponse personas(@Parameter(hidden = true) CurrentAccount caller) {
        return demoPersonaService.personas(caller);
    }

    @PostMapping("/sign-in")
    @Operation(summary = "Switch to a demo persona: ends the current session and starts the persona's, "
            + "with the same response as login")
    ResponseEntity<AccessTokenResponse> signIn(@Parameter(hidden = true) CurrentAccount caller,
            @Valid @RequestBody DemoSignInRequest request,
            @CookieValue(name = RefreshCookies.NAME, required = false) String refreshToken,
            HttpServletRequest httpRequest) {
        return refreshCookies.started(
                demoPersonaService.signIn(caller, request, refreshToken, httpRequest.getRemoteAddr()));
    }
}
