package com.hrmdemo.service.auth;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailPreparationException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

/** Sends the password reset link, in Vietnamese by default or in English when the request asks for it. */
@Component
public class PasswordResetMailer {

    private static final String SUBJECT_VI = "Đặt lại mật khẩu HRM";
    private static final String BODY_VI = """
            Xin chào,

            Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho Tài khoản HRM của bạn.
            Mở liên kết sau để đặt mật khẩu mới. Liên kết có hiệu lực trong %d phút và chỉ dùng được một lần:

            %s

            Nếu bạn không gửi yêu cầu này, hãy bỏ qua email; mật khẩu của bạn không thay đổi.
            """;

    private static final String SUBJECT_EN = "Reset your HRM password";
    private static final String BODY_EN = """
            Hello,

            We received a request to reset the password of your HRM Account.
            Open this link to set a new password. It works for %d minutes and only once:

            %s

            If you did not ask for this, ignore this email; your password stays the same.
            """;

    private final JavaMailSender mailSender;
    private final String appUrl;
    private final String from;

    public PasswordResetMailer(JavaMailSender mailSender,
            @Value("${hrm.app-url}") String appUrl,
            @Value("${hrm.mail.from}") String from) {
        this.mailSender = mailSender;
        this.appUrl = appUrl;
        this.from = from;
    }

    public void send(String toEmail, String rawToken, long validMinutes, Locale locale) {
        boolean english = locale != null && Locale.ENGLISH.getLanguage().equals(locale.getLanguage());
        String link = UriComponentsBuilder.fromUriString(appUrl)
                .path("/reset-password")
                .queryParam("token", rawToken)
                .toUriString();
        MimeMessage message = mailSender.createMimeMessage();
        try {
            var helper = new MimeMessageHelper(message, StandardCharsets.UTF_8.name());
            helper.setFrom(from);
            helper.setTo(toEmail);
            helper.setSubject(english ? SUBJECT_EN : SUBJECT_VI);
            helper.setText((english ? BODY_EN : BODY_VI).formatted(validMinutes, link));
        } catch (MessagingException e) {
            throw new MailPreparationException("Cannot build the password reset email", e);
        }
        mailSender.send(message);
    }
}
