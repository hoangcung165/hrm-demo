package com.hrmdemo.controller.resource;

import java.time.LocalDate;
import java.util.UUID;

import com.hrmdemo.dto.resource.BenchResponse;
import com.hrmdemo.dto.resource.CellDetailResponse;
import com.hrmdemo.dto.resource.EndingResponse;
import com.hrmdemo.dto.resource.HeatmapResponse;
import com.hrmdemo.dto.resource.OverviewResponse;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.resource.ResourceHeatmapService;
import com.hrmdemo.service.resource.ResourceOverviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Nguồn lực: the heatmap and its cell detail. Needs RESOURCE_VIEW. */
@RestController
@RequestMapping("/api/resources")
@RequiredArgsConstructor
public class ResourceController {

    private final ResourceHeatmapService heatmap;
    private final ResourceOverviewService overview;

    @GetMapping("/heatmap")
    @Operation(summary = "Tải phân bổ of every active Employee by week or month: one row each, the highest load per cell")
    HeatmapResponse heatmap(@Parameter(hidden = true) CurrentAccount caller,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) String granularity, @RequestParam(required = false) Integer columns,
            @RequestParam(required = false) String q, @RequestParam(required = false) UUID orgUnitId,
            @RequestParam(defaultValue = "true") boolean includeSubUnits,
            @RequestParam(required = false) String level, @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
        return heatmap.heatmap(caller, new ResourceHeatmapService.Query(from, granularity, columns, q, orgUnitId,
                includeSubUnits, level, sort, page, size));
    }

    @GetMapping("/employees/{employeeId}/load")
    @Operation(summary = "What a heatmap cell hides: the Employee's load by period and the allocations in the range")
    CellDetailResponse cell(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID employeeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return heatmap.cell(caller, employeeId, from, to);
    }
    @GetMapping("/bench")
    @Operation(summary = "Bench: people whose highest Tải phân bổ in the week or month is under the bench threshold")
    BenchResponse bench(@Parameter(hidden = true) CurrentAccount caller,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) String granularity, @RequestParam(required = false) UUID orgUnitId,
            @RequestParam(defaultValue = "true") boolean includeSubUnits, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return overview.bench(caller, new ResourceOverviewService.BenchQuery(from, granularity, orgUnitId,
                includeSubUnits, page, size));
    }

    @GetMapping("/ending")
    @Operation(summary = "Sắp hết dự án: allocations ending within the configured weeks, earliest first")
    EndingResponse ending(@Parameter(hidden = true) CurrentAccount caller,
            @RequestParam(required = false) UUID orgUnitId, @RequestParam(defaultValue = "true") boolean includeSubUnits,
            @RequestParam(defaultValue = "false") boolean onlyWithoutNext, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return overview.ending(caller, new ResourceOverviewService.EndingQuery(orgUnitId, includeSubUnits,
                onlyWithoutNext, page, size));
    }

    @GetMapping("/overview")
    @Operation(summary = "The Nguồn lực dashboard: tiles, project staffing, the load levels of 12 weeks and what needs a look")
    OverviewResponse overview(@Parameter(hidden = true) CurrentAccount caller,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate week,
            @RequestParam(required = false) UUID orgUnitId,
            @RequestParam(defaultValue = "true") boolean includeSubUnits) {
        return overview.overview(caller, week, orgUnitId, includeSubUnits);
    }
}
