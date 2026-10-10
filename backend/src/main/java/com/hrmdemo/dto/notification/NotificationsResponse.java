package com.hrmdemo.dto.notification;

import java.util.List;

/**
 * One page of the bell.
 *
 * @param total  every notification of the caller
 * @param unread the unread ones, for the count on the bell
 */
public record NotificationsResponse(List<NotificationItem> items, long total, long unread) {
}
