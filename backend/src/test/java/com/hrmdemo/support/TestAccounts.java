package com.hrmdemo.support;

import java.io.UnsupportedEncodingException;
import java.time.Instant;
import java.util.UUID;

import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.repository.auth.AccountRepository;
import com.jayway.jsonpath.JsonPath;
import org.springframework.boot.test.context.TestComponent;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** Creates Accounts with given roles and signs them in, for integration tests. Imported by {@link IntegrationTest}. */
@TestComponent
public class TestAccounts {

    public static final String PASSWORD = "test-password-1";
    /** The seeded Admin (application-test.yml). */
    public static final String ADMIN_EMAIL = "admin@hrm.test";
    public static final String ADMIN_PASSWORD = "test-admin-password";

    public record TestAccount(UUID id, String email) {
    }

    private final AccountRepository accounts;
    private final PasswordEncoder passwordEncoder;

    public TestAccounts(AccountRepository accounts, PasswordEncoder passwordEncoder) {
        this.accounts = accounts;
        this.passwordEncoder = passwordEncoder;
    }

    /** A new Account with a unique email and {@link #PASSWORD}. */
    public TestAccount create(Role... roles) {
        return create("Test Account", "user-" + UUID.randomUUID() + "@hrm.test", roles);
    }

    /** A new Account with the given full name and email (which must be unused) and {@link #PASSWORD}. */
    public TestAccount create(String fullName, String email, Role... roles) {
        Account account = new Account(email, fullName, passwordEncoder.encode(PASSWORD), Instant.now());
        for (Role role : roles) {
            account.addRole(role);
        }
        return new TestAccount(accounts.save(account).getId(), email);
    }

    /** Value of the Authorization header after signing in through the API. */
    public String bearer(MockMvcTester mvc, TestAccount account) {
        return bearer(mvc, account.email(), PASSWORD);
    }

    public String adminBearer(MockMvcTester mvc) {
        return bearer(mvc, ADMIN_EMAIL, ADMIN_PASSWORD);
    }

    private static String bearer(MockMvcTester mvc, String email, String password) {
        MvcTestResult login = mvc.post().uri("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"%s","password":"%s"}""".formatted(email, password))
                .exchange();
        try {
            return "Bearer " + JsonPath.<String>read(login.getResponse().getContentAsString(), "$.accessToken");
        } catch (UnsupportedEncodingException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
