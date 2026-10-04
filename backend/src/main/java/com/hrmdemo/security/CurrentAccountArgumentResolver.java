package com.hrmdemo.security;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.exception.ApiException;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

/** Resolves {@link CurrentAccount} controller parameters from the authenticated JWT. */
@Component
public class CurrentAccountArgumentResolver implements HandlerMethodArgumentResolver {

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return CurrentAccount.class.equals(parameter.getParameterType());
    }

    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
            NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication instanceof JwtAuthenticationToken token)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "auth.unauthenticated", "Authentication is required");
        }
        Jwt jwt = token.getToken();
        List<String> roles = jwt.getClaimAsStringList(JwtClaims.ROLES);
        return new CurrentAccount(UUID.fromString(jwt.getSubject()),
                roles == null ? new LinkedHashSet<>() : new LinkedHashSet<>(roles));
    }
}
