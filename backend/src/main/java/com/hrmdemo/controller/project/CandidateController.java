package com.hrmdemo.controller.project;

import java.time.LocalDate;
import java.util.UUID;

import com.hrmdemo.dto.project.CandidateQuery;
import com.hrmdemo.dto.project.ProjectCandidatesResponse;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.project.CandidateSearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Tìm người (HRM-16): the people who could join a project, by skill and % còn trống. Needs the right to edit the
 * project's Phân bổ (PROJECT_EDIT_ALL, or PROJECT_EDIT as its PM).
 */
@RestController
@RequestMapping("/api/projects/{projectId}")
@RequiredArgsConstructor
public class CandidateController {

    private final CandidateSearchService candidateSearch;

    @GetMapping("/candidates")
    @Operation(summary = "Tìm người: active Employees who meet at least one required skill, with % còn trống in "
            + "the range, best fit first; needs the right to edit the project's Phân bổ")
    ProjectCandidatesResponse search(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID projectId,
            @Parameter(description = "Required skills, one to five: <skillId>:<minLevel 1-5>, comma separated")
            @RequestParam(required = false) String skills,
            @Parameter(description = "First day; default today or the project's first day, whichever is later")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @Parameter(description = "Last day; default the project's last day")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @Parameter(description = "Cần phân bổ, 1 to 100") @RequestParam(required = false) Integer need,
            @Parameter(description = "match (default): skills met, then % còn trống; free: % còn trống first")
            @RequestParam(required = false) String sort,
            @Parameter(description = "Page number, from 0") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Rows per page, 1 to 100") @RequestParam(defaultValue = "20") int size) {
        return candidateSearch.search(caller, projectId,
                new CandidateQuery(skills, from, to, need, sort, page, size));
    }
}
