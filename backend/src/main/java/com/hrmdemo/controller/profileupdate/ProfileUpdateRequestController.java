package com.hrmdemo.controller.profileupdate;

import java.util.UUID;

import com.hrmdemo.dto.profileupdate.ProfileUpdateResponse;
import com.hrmdemo.dto.profileupdate.ProfileUpdateSubmitRequest;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.profileupdate.ProfileUpdateRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Cập nhật hồ sơ requests: an Employee asks for changes to the contact fields of their own profile. No permission:
 * any Account linked to an Employee sends one; the approval flow decides who approves.
 */
@RestController
@RequestMapping("/api/profile-update-requests")
@RequiredArgsConstructor
public class ProfileUpdateRequestController {

    private final ProfileUpdateRequestService profileUpdates;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Send changes to the caller's own contact fields for approval")
    ProfileUpdateResponse submit(@Parameter(hidden = true) CurrentAccount caller,
            @Valid @RequestBody ProfileUpdateSubmitRequest request) {
        return profileUpdates.submit(caller, request);
    }

    @GetMapping("/{id}")
    @Operation(summary = "The proposed changes of a profile update request (id of the approval request)")
    ProfileUpdateResponse get(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id) {
        return profileUpdates.get(caller, id);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Change a profile update returned to the sender and send it again")
    ProfileUpdateResponse resubmit(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id,
            @Valid @RequestBody ProfileUpdateSubmitRequest request) {
        return profileUpdates.resubmit(caller, id, request);
    }
}
