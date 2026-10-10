package com.hrmdemo.controller.notification;

import java.util.UUID;

import com.hrmdemo.dto.notification.NotificationsResponse;
import com.hrmdemo.dto.notification.UnreadCountResponse;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.notification.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** The bell in the header: the caller's own notifications. */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notifications;

    @GetMapping
    @Operation(summary = "The caller's notifications, newest first, with the unread count")
    NotificationsResponse list(@Parameter(hidden = true) CurrentAccount caller,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return notifications.list(caller, page, size);
    }

    @GetMapping("/unread-count")
    @Operation(summary = "The count on the bell")
    UnreadCountResponse unread(@Parameter(hidden = true) CurrentAccount caller) {
        return notifications.unread(caller);
    }

    @PostMapping("/{id}/read")
    @Operation(summary = "Mark one notification read; returns the new unread count")
    UnreadCountResponse read(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id) {
        return notifications.markRead(caller, id);
    }

    @PostMapping("/read-all")
    @Operation(summary = "Đánh dấu đã đọc hết")
    UnreadCountResponse readAll(@Parameter(hidden = true) CurrentAccount caller) {
        return notifications.markAllRead(caller);
    }
}
