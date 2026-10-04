package com.hrmdemo.controller.orgunit;

import java.util.UUID;

import com.hrmdemo.dto.orgunit.OrgStructureResponse;
import com.hrmdemo.dto.orgunit.OrgUnitCreateRequest;
import com.hrmdemo.dto.orgunit.OrgUnitMoveRequest;
import com.hrmdemo.dto.orgunit.OrgUnitResponse;
import com.hrmdemo.dto.orgunit.OrgUnitUpdateRequest;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.orgunit.OrgUnitService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** The org tree of the company: Đơn vị tổ chức (Organization units) and their heads. */
@RestController
@RequestMapping("/api/org-units")
@RequiredArgsConstructor
public class OrgUnitController {

    private final OrgUnitService orgUnitService;

    @GetMapping
    @Operation(summary = "The whole org tree: the company node, every unit (inactive ones too) and a summary; "
            + "needs ORG_VIEW")
    OrgStructureResponse structure(@Parameter(hidden = true) CurrentAccount account) {
        return orgUnitService.structure(account);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add a unit under a parent unit, or under the company when parentId is null; needs ORG_EDIT")
    OrgUnitResponse create(@Parameter(hidden = true) CurrentAccount account,
            @Valid @RequestBody OrgUnitCreateRequest request) {
        return orgUnitService.create(account, request);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Edit a unit's name, code, type and head; needs ORG_EDIT")
    OrgUnitResponse update(@Parameter(hidden = true) CurrentAccount account, @PathVariable UUID id,
            @Valid @RequestBody OrgUnitUpdateRequest request) {
        return orgUnitService.update(account, id, request);
    }

    @PostMapping("/{id}/move")
    @Operation(summary = "Move a unit, with everything below it, to another parent; parentId null moves it "
            + "under the company; needs ORG_EDIT")
    OrgUnitResponse move(@Parameter(hidden = true) CurrentAccount account, @PathVariable UUID id,
            @Valid @RequestBody OrgUnitMoveRequest request) {
        return orgUnitService.move(account, id, request);
    }

    @PostMapping("/{id}/deactivate")
    @Operation(summary = "Deactivate a unit; child units are not changed; needs ORG_EDIT")
    OrgUnitResponse deactivate(@Parameter(hidden = true) CurrentAccount account, @PathVariable UUID id) {
        return orgUnitService.deactivate(account, id);
    }

    @PostMapping("/{id}/reactivate")
    @Operation(summary = "Reactivate a unit; needs ORG_EDIT")
    OrgUnitResponse reactivate(@Parameter(hidden = true) CurrentAccount account, @PathVariable UUID id) {
        return orgUnitService.reactivate(account, id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a unit that has no child units and no employees; needs ORG_EDIT")
    void delete(@Parameter(hidden = true) CurrentAccount account, @PathVariable UUID id) {
        orgUnitService.delete(account, id);
    }
}
