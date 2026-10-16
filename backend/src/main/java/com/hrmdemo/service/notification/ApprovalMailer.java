package com.hrmdemo.service.notification;

import java.nio.charset.StandardCharsets;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.approval.ApprovalRequestType;
import com.hrmdemo.dto.employee.EmployeeCard;
import com.hrmdemo.dto.notification.NotificationKind;
import com.hrmdemo.service.approval.ApprovalEvent;
import com.hrmdemo.service.approval.ApprovalRequestService;
import com.hrmdemo.service.auth.AccountService;
import com.hrmdemo.service.employee.EmployeeService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Emails about approval requests, in Vietnamese, to the Account linked to each recipient: the approvers when a
 * request reaches their level, the sender when it is approved, rejected or returned. The email names the request and
 * links to it; it has no approve button, so the approver reads the whole request first (approved design).
 * A mail server outage is logged and never fails the change, which has already committed.
 */
@Slf4j
@Component
class ApprovalMailer {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(ZONE);
    private static final Map<ApprovalRequestType, String> TYPES = Map.of(
            ApprovalRequestType.PROFILE_UPDATE, "Cập nhật hồ sơ",
            ApprovalRequestType.LEAVE, "Nghỉ phép",
            ApprovalRequestType.OVERTIME, "Tăng ca (OT)",
            ApprovalRequestType.ATTENDANCE_ADJUSTMENT, "Bổ sung công",
            ApprovalRequestType.TIMESHEET, "Timesheet dự án",
            ApprovalRequestType.PAYROLL, "Bảng lương");

    private final JavaMailSender mailSender;
    private final ApprovalRequestService requests;
    private final EmployeeService employees;
    private final AccountService accounts;
    private final String appUrl;
    private final String from;

    ApprovalMailer(JavaMailSender mailSender, ApprovalRequestService requests, EmployeeService employees,
            AccountService accounts, @Value("${hrm.app-url}") String appUrl, @Value("${hrm.mail.from}") String from) {
        this.mailSender = mailSender;
        this.requests = requests;
        this.employees = employees;
        this.accounts = accounts;
        this.appUrl = appUrl;
        this.from = from;
    }

    /** After the commit: its own read-only transaction. */
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void send(ApprovalEvent event) {
        ApprovalRequestService.Summary request = requests.summary(event.requestId());
        NotificationKind kind = ApprovalNotificationListener.kind(event, request);
        if (kind == null) {
            return;
        }
        String type = TYPES.get(event.requestType());
        EmployeeCard sender = employees.cards(Set.of(request.senderId())).get(request.senderId());
        EmployeeCard actor = event.actorId() == null ? null
                : employees.cards(Set.of(event.actorId())).get(event.actorId());
        String senderName = sender == null ? "" : sender.fullName();
        String actorName = actor == null ? "Hệ thống" : actor.fullName();
        String link = UriComponentsBuilder.fromUriString(appUrl).path("/approvals/{id}")
                .buildAndExpand(event.requestId()).toUriString();
        String subject = switch (kind) {
            case APPROVAL_WAITING -> "[Chờ duyệt] " + type + " của " + senderName;
            case APPROVAL_RESUBMITTED -> "[Chờ duyệt] " + senderName + " đã bổ sung " + type;
            case APPROVAL_APPROVED -> "[Đã duyệt] " + type + " của bạn";
            case APPROVAL_REJECTED -> "[Bị từ chối] " + type + " của bạn";
            case APPROVAL_RETURNED -> "[Cần bổ sung] " + type + " của bạn";
            case DELEGATION_RECEIVED, LEAVE_COPIED, LEAVE_CANCELLED -> null;
        };
        String body = switch (kind) {
            case APPROVAL_WAITING, APPROVAL_RESUBMITTED -> """
                    %s gửi yêu cầu %s, đang chờ bạn duyệt ở Cấp %d.

                    Nội dung: %s
                    Gửi lúc: %s

                    Mở yêu cầu: %s

                    Bạn nhận email này vì là người duyệt của yêu cầu.
                    """.formatted(senderName, type.toLowerCase(), event.level(), request.summary(),
                    TIME.format(event.at()), link);
            case APPROVAL_APPROVED -> """
                    %s đã duyệt yêu cầu %s của bạn.

                    Nội dung: %s

                    Xem yêu cầu: %s
                    """.formatted(actorName, type.toLowerCase(), request.summary(), link);
            case APPROVAL_REJECTED, APPROVAL_RETURNED -> """
                    %s đã %s yêu cầu %s của bạn.

                    Lý do: %s

                    %s: %s
                    """.formatted(actorName, kind == NotificationKind.APPROVAL_REJECTED ? "từ chối" : "trả về",
                    type.toLowerCase(), Optional.ofNullable(event.comment()).orElse(""),
                    kind == NotificationKind.APPROVAL_REJECTED ? "Xem yêu cầu" : "Sửa và gửi lại", link);
            case DELEGATION_RECEIVED, LEAVE_COPIED, LEAVE_CANCELLED -> null;
        };
        if (subject == null) {
            return;
        }
        for (UUID recipient : event.recipients()) {
            accounts.emailOfEmployee(recipient).ifPresent(to -> deliver(to, subject, body));
        }
    }

    private void deliver(String to, String subject, String body) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, StandardCharsets.UTF_8.name());
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body);
            mailSender.send(message);
        } catch (MessagingException | MailException e) {
            log.warn("Could not send the approval email \"{}\": {}", subject, e.getMessage());
        }
    }
}
