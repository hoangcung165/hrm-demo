package com.hrmdemo.controller.accessscope;

import com.hrmdemo.dto.accessscope.RoleMatrixResponse;
import com.hrmdemo.dto.accessscope.RolePermissionsRequest;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.accessscope.RolePermissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class RoleController {

    private final AccessScopeService accessScopeService;
    private final RolePermissionService rolePermissionService;

    @GetMapping("/api/roles")
    @Operation(summary = "Role and permission matrix: the data scope and permissions of every role in this "
            + "company; needs ACCOUNT_LIST")
    RoleMatrixResponse roles(@Parameter(hidden = true) CurrentAccount caller) {
        return accessScopeService.roleMatrix(caller);
    }

    @PutMapping("/api/roles/permissions")
    @Operation(summary = "Replace the permissions of the listed roles, all or nothing; a role left out keeps "
            + "its own; needs ACCOUNT_EDIT")
    RoleMatrixResponse updatePermissions(@Parameter(hidden = true) CurrentAccount caller,
            @Valid @RequestBody RolePermissionsRequest request) {
        return rolePermissionService.update(caller, request);
    }

    @PostMapping("/api/roles/reset")
    @Operation(summary = "Put every role back to its default permissions; needs ACCOUNT_EDIT")
    RoleMatrixResponse reset(@Parameter(hidden = true) CurrentAccount caller) {
        return rolePermissionService.reset(caller);
    }
}
