package com.hrmdemo.controller.accessscope;

import com.hrmdemo.dto.accessscope.RoleMatrixResponse;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScopeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class RoleController {

    private final AccessScopeService accessScopeService;

    @GetMapping("/api/roles")
    @Operation(summary = "Role and permission matrix: the data scope and permissions of every role")
    RoleMatrixResponse roles(@Parameter(hidden = true) CurrentAccount caller) {
        return accessScopeService.roleMatrix(caller);
    }
}
