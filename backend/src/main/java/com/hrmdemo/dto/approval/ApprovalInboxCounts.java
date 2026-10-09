package com.hrmdemo.dto.approval;

/**
 * The counts next to the inbox tabs and on the sidebar item.
 *
 * @param waiting requests waiting for the caller (Chờ tôi duyệt)
 * @param sent    the caller's own requests still open: waiting or returned (Tôi đã gửi)
 */
public record ApprovalInboxCounts(long waiting, long sent) {
}
