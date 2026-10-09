package com.hrmdemo.controller.approval;

import java.util.UUID;

import com.hrmdemo.dto.PageResponse;
import com.hrmdemo.dto.approval.ApprovalBox;
import com.hrmdemo.dto.approval.ApprovalDecisionRequest;
import com.hrmdemo.dto.approval.ApprovalInboxCounts;
import com.hrmdemo.dto.approval.ApprovalInboxItem;
import com.hrmdemo.dto.approval.ApprovalRequestResponse;
import com.hrmdemo.dto.approval.ApprovalRequestType;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.approval.ApprovalInboxService;
import com.hrmdemo.service.approval.ApprovalRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Hộp thư duyệt and the actions on a Yêu cầu phê duyệt. No permission: the flow decides who approves, and only the
 * people involved in a request see it (404 for the others). Requests are sent by the feature of their type.
 */
@RestController
@RequestMapping("/api/approvals")
@RequiredArgsConstructor
public class ApprovalRequestController {

    private final ApprovalRequestService requests;
    private final ApprovalInboxService inbox;

    @GetMapping
    @Operation(summary = "One tab of the inbox: WAITING (soonest auto-approve first), SENT or HANDLED (latest first)")
    PageResponse<ApprovalInboxItem> list(@Parameter(hidden = true) CurrentAccount caller,
            @RequestParam(defaultValue = "WAITING") ApprovalBox box,
            @RequestParam(required = false) ApprovalRequestType type,
            @Parameter(description = "Part of the sender's name or code; case and accents do not matter")
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return inbox.list(caller, box, type, q, page, size);
    }

    @GetMapping("/counts")
    @Operation(summary = "Requests waiting for the caller, and the caller's own requests still open")
    ApprovalInboxCounts counts(@Parameter(hidden = true) CurrentAccount caller) {
        return inbox.counts(caller);
    }

    @GetMapping("/{id}")
    @Operation(summary = "A request with its steps, its log and what the caller may do")
    ApprovalRequestResponse get(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id) {
        return requests.get(caller, id);
    }

    @PostMapping("/{id}/approve")
    @Operation(summary = "Duyệt the waiting level, with an optional note")
    ApprovalRequestResponse approve(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id,
            @Valid @RequestBody(required = false) ApprovalDecisionRequest request) {
        return requests.approve(caller, id, comment(request));
    }

    @PostMapping("/{id}/reject")
    @Operation(summary = "Từ chối: ends the request; the reason is required")
    ApprovalRequestResponse reject(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id,
            @Valid @RequestBody(required = false) ApprovalDecisionRequest request) {
        return requests.reject(caller, id, comment(request));
    }

    @PostMapping("/{id}/return")
    @Operation(summary = "Trả về để bổ sung: back to the sender; the reason is required")
    ApprovalRequestResponse returnForInfo(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id,
            @Valid @RequestBody(required = false) ApprovalDecisionRequest request) {
        return requests.returnForInfo(caller, id, comment(request));
    }

    @PostMapping("/{id}/resubmit")
    @Operation(summary = "The sender sends a returned request again; it continues at the level that returned it")
    ApprovalRequestResponse resubmit(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id,
            @Valid @RequestBody(required = false) ApprovalDecisionRequest request) {
        return requests.resubmit(caller, id, comment(request));
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "The sender withdraws a waiting or returned request")
    ApprovalRequestResponse cancel(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id) {
        return requests.cancel(caller, id);
    }

    private static String comment(ApprovalDecisionRequest request) {
        return request == null ? null : request.comment();
    }
}
