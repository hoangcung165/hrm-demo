package com.hrmdemo.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/** The signed-in Account as read from the access JWT, with and without a linked Employee. */
class CurrentAccountArgumentResolverTest {

    static final UUID ACCOUNT = UUID.fromString("00000000-0000-0000-0000-000000000001");
    static final UUID EMPLOYEE = UUID.fromString("00000000-0000-0000-0000-0000000000e1");

    final CurrentAccountArgumentResolver resolver = new CurrentAccountArgumentResolver();

    @AfterEach
    void signOut() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void theEmployeeOfTheAccountIsReadFromTheToken() {
        signIn(token().claim(JwtClaims.EMPLOYEE_ID, EMPLOYEE.toString()).build());

        assertThat(resolve()).isEqualTo(new CurrentAccount(ACCOUNT, EMPLOYEE, Set.of("LINE_MANAGER")));
    }

    @Test
    void anAccountWithoutAnEmployeeHasNone() {
        signIn(token().build());

        CurrentAccount account = resolve();

        assertThat(account.id()).isEqualTo(ACCOUNT);
        assertThat(account.employeeId()).isNull();
        assertThat(account.roles()).containsExactly("LINE_MANAGER");
    }

    private static Jwt.Builder token() {
        return Jwt.withTokenValue("token")
                .header("alg", "HS256")
                .subject(ACCOUNT.toString())
                .claim(JwtClaims.ROLES, List.of("LINE_MANAGER"));
    }

    private static void signIn(Jwt jwt) {
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));
    }

    private CurrentAccount resolve() {
        return (CurrentAccount) resolver.resolveArgument(null, null, null, null);
    }
}
