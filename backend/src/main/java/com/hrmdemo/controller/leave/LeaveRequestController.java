package com.hrmdemo.controller.leave;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.dto.PageResponse;
import com.hrmdemo.dto.employee.EmployeeCard;
import com.hrmdemo.dto.leave.LeaveAttachmentSummary;
import com.hrmdemo.dto.leave.LeaveBalancesResponse;
import com.hrmdemo.dto.leave.LeaveCheckResponse;
import com.hrmdemo.dto.leave.LeaveRequestListItem;
import com.hrmdemo.dto.leave.LeaveRequestPayload;
import com.hrmdemo.dto.leave.LeaveRequestResponse;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.employee.EmployeeAttachmentChecks;
import com.hrmdemo.service.leave.LeaveAttachmentService;
import com.hrmdemo.service.leave.LeaveBalanceService;
import com.hrmdemo.service.leave.LeaveRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartFile;

/**
 * Đơn nghỉ and Số dư phép. No permission: any Account linked to an Employee checks, sends and reads its own; the
 * Luồng phê duyệt "Nghỉ phép" decides who approves (through {@code /api/approvals}). Reading someone else's balance
 * needs EMPLOYEE_VIEW over them.
 */
@RestController
@RequiredArgsConstructor
public class LeaveRequestController {

    private final LeaveRequestService leaveRequests;
    private final LeaveBalanceService balances;
    private final LeaveAttachmentService attachments;

    @GetMapping("/api/leave-balances")
    @Operation(summary = "Số dư phép per type for a year: the caller's own, or an Employee's with EMPLOYEE_VIEW")
    LeaveBalancesResponse balances(@Parameter(hidden = true) CurrentAccount caller,
            @Parameter(description = "Null for the caller") @RequestParam(required = false) UUID employeeId,
            @Parameter(description = "Null for this year") @RequestParam(required = false) Integer year) {
        return balances.balances(caller, employeeId, year);
    }

    @PostMapping("/api/leave-requests/check")
    @Operation(summary = "Check a request without saving it: the days, the balance after, the problems, the approvers")
    LeaveCheckResponse check(@Parameter(hidden = true) CurrentAccount caller,
            @RequestBody LeaveRequestPayload payload) {
        return leaveRequests.check(caller, payload);
    }

    @PostMapping("/api/leave-requests")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Send a request for approval; refused with the code of the first problem the check finds")
    LeaveRequestResponse submit(@Parameter(hidden = true) CurrentAccount caller,
            @RequestBody LeaveRequestPayload payload) {
        return leaveRequests.submit(caller, payload);
    }

    @GetMapping("/api/leave-requests")
    @Operation(summary = "The caller's requests touching a year, latest first")
    PageResponse<LeaveRequestListItem> mine(@Parameter(hidden = true) CurrentAccount caller,
            @Parameter(description = "Null for this year") @RequestParam(required = false) Integer year,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return leaveRequests.mine(caller, year, page, size);
    }

    @GetMapping("/api/leave-requests/cc-candidates")
    @Operation(summary = "People a request may copy (CC): active Employees by name or code, the caller left out")
    List<EmployeeCard> ccCandidates(@Parameter(hidden = true) CurrentAccount caller,
            @RequestParam(required = false) String q) {
        return leaveRequests.ccCandidates(caller, q);
    }

    @GetMapping("/api/leave-requests/{id}")
    @Operation(summary = "One request (id of its approval request), for its sender, approvers and people copied")
    LeaveRequestResponse get(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id) {
        return leaveRequests.get(caller, id);
    }

    @PutMapping("/api/leave-requests/{id}")
    @Operation(summary = "Change a request returned to its sender and send it again")
    LeaveRequestResponse resubmit(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id,
            @RequestBody LeaveRequestPayload payload) {
        return leaveRequests.resubmit(caller, id, payload);
    }

    @PostMapping("/api/leave-requests/{id}/cancel")
    @Operation(summary = "Cancel a request: while it waits, or once approved until it starts (the days come back)")
    LeaveRequestResponse cancel(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id) {
        return leaveRequests.cancel(caller, id);
    }

    @PostMapping(path = "/api/leave-attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Upload a file for a request (PDF/PNG/JPEG/DOCX/XLSX, up to 5 MiB), then name it when sending")
    LeaveAttachmentSummary upload(@Parameter(hidden = true) CurrentAccount caller,
            @RequestPart(name = "file", required = false) MultipartFile file) {
        return attachments.upload(caller, file);
    }

    @GetMapping("/api/leave-requests/{id}/attachments/{attachmentId}")
    @Operation(summary = "Download a file of a request as an attachment; never rendered inline")
    ResponseEntity<byte[]> download(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id,
            @PathVariable UUID attachmentId) {
        LeaveRequestService.Download file = leaveRequests.attachment(caller, id, attachmentId);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .contentLength(file.content().length)
                .cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Disposition", ContentDisposition.attachment()
                        .filename(file.fileName(), StandardCharsets.UTF_8).build().toString())
                .body(file.content());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ProblemDetail tooLarge() {
        ApiException error = EmployeeAttachmentChecks.tooLarge();
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(error.getStatus(), error.getMessage());
        problem.setProperty("code", error.getCode());
        return problem;
    }
}
