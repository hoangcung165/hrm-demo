package com.hrmdemo.controller.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Arrays;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.repository.auth.AccountRepository;
import com.hrmdemo.support.IntegrationTest;
import com.icegreen.greenmail.junit5.GreenMailExtension;
import com.icegreen.greenmail.util.ServerSetupTest;
import com.jayway.jsonpath.JsonPath;
import jakarta.mail.Message;
import jakarta.mail.internet.MimeMessage;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * Password API against real PostgreSQL and a GreenMail SMTP server (port 3025, see application-test.yml).
 * Each test creates its own Account so the seeded Admin used by other tests keeps its password.
 */
@IntegrationTest
class PasswordApiIT {

    static final String OLD_PASSWORD = "old-password-1";
    static final String NEW_PASSWORD = "new-password-2";
    static final Pattern RESET_LINK = Pattern.compile("http://localhost:5173/reset-password\\?token=([A-Za-z0-9_-]+)");

    @RegisterExtension
    static GreenMailExtension greenMail = new GreenMailExtension(ServerSetupTest.SMTP).withPerMethodLifecycle(false);

    @Autowired
    MockMvcTester mvc;
    @Autowired
    AccountRepository accounts;
    @Autowired
    PasswordEncoder passwordEncoder;

    @Test
    void forgotThenResetThenLoginWithTheNewPassword() throws Exception {
        String email = newAccount();
        Cookie oldRefreshCookie = login(email, OLD_PASSWORD).getResponse().getCookie("refresh_token");

        assertThat(forgot(email, "en")).hasStatus(204);

        MimeMessage mail = mailTo(email);
        assertThat(mail.getSubject()).isEqualTo("Reset your HRM password");
        String token = resetToken(mail);

        assertThat(reset(token, NEW_PASSWORD)).hasStatus(204);
        assertThat(login(email, NEW_PASSWORD)).hasStatusOk();
        assertThat(login(email, OLD_PASSWORD)).hasStatus(401);
        // A reset signs the Account out everywhere.
        assertThat(mvc.post().uri("/api/auth/refresh").cookie(oldRefreshCookie)).hasStatus(401);

        MvcTestResult secondUse = reset(token, "another-password-3");
        assertThat(secondUse).hasStatus(400);
        assertThat(secondUse).bodyJson().extractingPath("$.code").isEqualTo("auth.reset_token_invalid");
        assertThat(login(email, NEW_PASSWORD)).hasStatusOk();
    }

    @Test
    void forgotPasswordMailIsVietnameseByDefault() throws Exception {
        String email = newAccount();

        assertThat(forgot(email, null)).hasStatus(204);

        MimeMessage mail = mailTo(email);
        assertThat(mail.getSubject()).isEqualTo("Đặt lại mật khẩu HRM");
        assertThat(mail.getContent().toString()).contains("30 phút");
        assertThat(resetToken(mail)).isNotBlank();
    }

    @Test
    void aNewResetLinkRetiresTheEarlierOne() throws Exception {
        String email = newAccount();
        forgot(email, "en");
        String firstToken = resetToken(mailTo(email));
        forgot(email, "en");

        assertThat(reset(firstToken, NEW_PASSWORD)).hasStatus(400);
    }

    @Test
    void forgotPasswordForAnUnknownEmailAnswers204AndSendsNothing() throws Exception {
        String email = "nobody-" + UUID.randomUUID() + "@hrm.test";

        assertThat(forgot(email, "en")).hasStatus(204);

        assertThat(countMailTo(email)).isZero();
    }

    @Test
    void changePasswordRevokesTheOldRefreshToken() throws Exception {
        String email = newAccount();
        MvcTestResult login = login(email, OLD_PASSWORD);
        String accessToken = JsonPath.read(login.getResponse().getContentAsString(), "$.accessToken");
        Cookie refreshCookie = login.getResponse().getCookie("refresh_token");

        MvcTestResult wrongCurrent = changePassword(accessToken, "not-the-password", NEW_PASSWORD);
        assertThat(wrongCurrent).hasStatus(400);
        assertThat(wrongCurrent).bodyJson().extractingPath("$.code").isEqualTo("auth.current_password_incorrect");

        assertThat(changePassword(accessToken, OLD_PASSWORD, NEW_PASSWORD)).hasStatus(204);

        assertThat(mvc.post().uri("/api/auth/refresh").cookie(refreshCookie)).hasStatus(401);
        assertThat(login(email, NEW_PASSWORD)).hasStatusOk();
        assertThat(login(email, OLD_PASSWORD)).hasStatus(401);
    }

    @Test
    void changePasswordNeedsAJwt() {
        MvcTestResult result = changePassword(null, OLD_PASSWORD, NEW_PASSWORD);

        assertThat(result).hasStatus(401);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("auth.unauthenticated");
    }

    @Test
    void passwordsShorterThan8CharactersAreRejected() throws Exception {
        String email = newAccount();
        forgot(email, "en");

        MvcTestResult result = reset(resetToken(mailTo(email)), "short-7");

        assertThat(result).hasStatus(400);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("validation.invalid");
        assertThat(result).bodyJson().extractingPath("$.errors[0].field").isEqualTo("newPassword");
        assertThat(login(email, OLD_PASSWORD)).hasStatusOk();
    }

    private String newAccount() {
        String email = "user-" + UUID.randomUUID() + "@hrm.test";
        accounts.save(new Account(email, "Reset Tester", passwordEncoder.encode(OLD_PASSWORD), Instant.now()));
        return email;
    }

    private MvcTestResult login(String email, String password) {
        return post("/api/auth/login", """
                {"email":"%s","password":"%s"}""".formatted(email, password), null, null);
    }

    private MvcTestResult forgot(String email, String language) {
        return post("/api/auth/forgot-password", """
                {"email":"%s"}""".formatted(email), null, language);
    }

    private MvcTestResult reset(String token, String newPassword) {
        return post("/api/auth/reset-password", """
                {"token":"%s","newPassword":"%s"}""".formatted(token, newPassword), null, null);
    }

    private MvcTestResult changePassword(String accessToken, String currentPassword, String newPassword) {
        return post("/api/auth/change-password", """
                {"currentPassword":"%s","newPassword":"%s"}""".formatted(currentPassword, newPassword),
                accessToken, null);
    }

    private MvcTestResult post(String path, String json, String accessToken, String language) {
        var request = mvc.post().uri(path).contentType(MediaType.APPLICATION_JSON).content(json);
        if (accessToken != null) {
            request = request.header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken);
        }
        if (language != null) {
            request = request.header(HttpHeaders.ACCEPT_LANGUAGE, language);
        }
        return request.exchange();
    }

    /** The newest mail sent to the address. */
    private static MimeMessage mailTo(String email) throws Exception {
        MimeMessage latest = null;
        for (MimeMessage message : greenMail.getReceivedMessages()) {
            if (isTo(message, email)) {
                latest = message;
            }
        }
        assertThat(latest).as("mail to " + email).isNotNull();
        return latest;
    }

    private static long countMailTo(String email) throws Exception {
        long count = 0;
        for (MimeMessage message : greenMail.getReceivedMessages()) {
            if (isTo(message, email)) {
                count++;
            }
        }
        return count;
    }

    private static boolean isTo(MimeMessage message, String email) throws Exception {
        return Arrays.stream(message.getRecipients(Message.RecipientType.TO))
                .anyMatch(address -> address.toString().equalsIgnoreCase(email));
    }

    private static String resetToken(MimeMessage mail) throws Exception {
        Matcher matcher = RESET_LINK.matcher(mail.getContent().toString());
        assertThat(matcher.find()).as("reset link in mail body").isTrue();
        return matcher.group(1);
    }
}
