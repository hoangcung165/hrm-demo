package com.hrmdemo.controller.approval;

import com.hrmdemo.dto.approval.ApprovalFlowRequest;
import com.hrmdemo.dto.approval.ApprovalFlowResponse;
import com.hrmdemo.dto.approval.ApprovalFlowsResponse;
import com.hrmdemo.dto.approval.ApprovalRequestType;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.approval.ApprovalFlowService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Luồng phê duyệt of each request type ("Hệ thống › Luồng phê duyệt"); needs APPROVAL_FLOW_EDIT. */
@RestController
@RequestMapping("/api/approval-flows")
@RequiredArgsConstructor
public class ApprovalFlowController {

    private final ApprovalFlowService flows;

    @GetMapping
    @Operation(summary = "The flow in force for every request type, in display order")
    ApprovalFlowsResponse list(@Parameter(hidden = true) CurrentAccount caller) {
        return flows.list(caller);
    }

    @PutMapping("/{requestType}")
    @Operation(summary = "Save the whole flow of one request type; requests already sent keep theirs")
    ApprovalFlowResponse update(@Parameter(hidden = true) CurrentAccount caller,
            @PathVariable ApprovalRequestType requestType, @Valid @RequestBody ApprovalFlowRequest request) {
        return flows.update(caller, requestType, request);
    }
}
