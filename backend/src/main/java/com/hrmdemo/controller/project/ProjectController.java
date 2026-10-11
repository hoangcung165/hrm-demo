package com.hrmdemo.controller.project;

import java.util.UUID;

import com.hrmdemo.dto.PageResponse;
import com.hrmdemo.dto.project.ProjectListItem;
import com.hrmdemo.dto.project.ProjectListQuery;
import com.hrmdemo.dto.project.ProjectRequest;
import com.hrmdemo.dto.project.ProjectResponse;
import com.hrmdemo.dto.project.ProjectUpdateRequest;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.project.ProjectService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Dự án (HRM-15). Reading needs PROJECT_VIEW. Adding needs PROJECT_EDIT, with oneself as PM unless the caller also
 * has PROJECT_EDIT_ALL; editing needs PROJECT_EDIT_ALL, or PROJECT_EDIT on a project one is the PM of.
 */
@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @GetMapping
    @Operation(summary = "One page of projects, newest start first; needs PROJECT_VIEW")
    PageResponse<ProjectListItem> list(
            @Parameter(hidden = true) CurrentAccount caller,
            @Parameter(description = "Page number, from 0") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Rows per page, 1 to 100") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Part of the code, name or client; case and accents do not matter")
            @RequestParam(required = false) String q,
            @Parameter(description = "Only the projects the caller's Employee is the PM of")
            @RequestParam(defaultValue = "false") boolean mine,
            @Parameter(description = "Comma-separated PLANNED, ACTIVE, ON_HOLD, CLOSED; empty means all but CLOSED")
            @RequestParam(required = false) String status,
            @Parameter(description = "One owning unit (Phòng ban phụ trách)")
            @RequestParam(required = false) UUID orgUnitId) {
        return projectService.list(caller, new ProjectListQuery(page, size, q, mine, status, orgUnitId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "One project, with whether the caller may edit it; needs PROJECT_VIEW")
    ProjectResponse get(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id) {
        return projectService.get(caller, id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add a project; needs PROJECT_EDIT, and PROJECT_EDIT_ALL to name another PM")
    ProjectResponse create(@Parameter(hidden = true) CurrentAccount caller, @RequestBody ProjectRequest request) {
        return projectService.create(caller, request);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Replace everything but the code; needs PROJECT_EDIT_ALL, or PROJECT_EDIT as its PM")
    ProjectResponse update(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id,
            @RequestBody ProjectUpdateRequest request) {
        return projectService.update(caller, id, request);
    }
}
