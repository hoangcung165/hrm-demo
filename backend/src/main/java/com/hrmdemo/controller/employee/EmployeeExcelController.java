package com.hrmdemo.controller.employee;

import java.util.UUID;

import com.hrmdemo.dto.employee.EmployeeExportQuery;
import com.hrmdemo.dto.employee.EmployeeSpreadsheet;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.employee.EmployeeExcelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Excel files of Employees (HRM-07): the import template and the export of the list. The literal paths win over
 * {@code GET /api/employees/{id}}. Errors come back as problem+json, never as a broken file.
 */
@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
public class EmployeeExcelController {

    /** How many Employees the file holds, for the web's toast. */
    static final String TOTAL_COUNT_HEADER = "X-Total-Count";

    private final EmployeeExcelService excelService;

    @GetMapping("/import/template")
    @Operation(summary = "The .xlsx import template with the units and positions the caller may use; needs "
            + "EMPLOYEE_EDIT")
    @ApiResponse(responseCode = "200", content = @Content(mediaType = EmployeeSpreadsheet.CONTENT_TYPE,
            schema = @Schema(type = "string", format = "binary")))
    ResponseEntity<byte[]> template(@Parameter(hidden = true) CurrentAccount caller) {
        return file(excelService.template(caller));
    }

    @GetMapping("/export")
    @Operation(summary = "The employee list as .xlsx, with the list's filters and data scope and no paging; at most "
            + "5,000 rows; identity numbers masked without EMPLOYEE_SENSITIVE_VIEW; needs EMPLOYEE_VIEW")
    @ApiResponse(responseCode = "200", content = @Content(mediaType = EmployeeSpreadsheet.CONTENT_TYPE,
            schema = @Schema(type = "string", format = "binary")))
    ResponseEntity<byte[]> export(
            @Parameter(hidden = true) CurrentAccount caller,
            @Parameter(description = "Part of the full name or the employee code; case and accents do not matter")
            @RequestParam(required = false) String q,
            @Parameter(description = "One unit") @RequestParam(required = false) UUID orgUnitId,
            @Parameter(description = "With orgUnitId: also every unit below it, inactive ones included")
            @RequestParam(defaultValue = "true") boolean includeSubUnits,
            @Parameter(description = "One Chức danh") @RequestParam(required = false) UUID positionId,
            @Parameter(description = "Comma-separated PROBATION, OFFICIAL, INACTIVE; empty means all")
            @RequestParam(required = false) String status,
            @Parameter(description = "code (default), fullName or hireDate, optionally with ,asc or ,desc")
            @RequestParam(required = false) String sort,
            @Parameter(description = "Nationality ISO alpha-2; same filter as Employee list")
            @RequestParam(required = false) String nationality) {
        return file(excelService.export(caller,
                new EmployeeExportQuery(q, orgUnitId, includeSubUnits, positionId, status, sort, nationality)));
    }

    /** No caching anywhere: the file may hold identity numbers. */
    private static ResponseEntity<byte[]> file(EmployeeSpreadsheet spreadsheet) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(EmployeeSpreadsheet.CONTENT_TYPE))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(spreadsheet.fileName()).build().toString())
                .header(TOTAL_COUNT_HEADER, String.valueOf(spreadsheet.rowCount()))
                .cacheControl(CacheControl.noStore())
                .body(spreadsheet.content());
    }
}
