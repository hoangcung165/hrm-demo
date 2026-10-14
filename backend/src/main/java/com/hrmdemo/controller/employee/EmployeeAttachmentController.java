package com.hrmdemo.controller.employee;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.dto.employee.EmployeeAttachmentSummary;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.employee.EmployeeAttachmentChecks;
import com.hrmdemo.service.employee.EmployeeAttachmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartFile;

/** Private Employee document API. File bytes are never exposed through a public URL. */
@RestController
@RequestMapping("/api/employees/{employeeId}/attachments")
@RequiredArgsConstructor
public class EmployeeAttachmentController {
    private final EmployeeAttachmentService service;

    @GetMapping
    @Operation(summary = "List private attachment metadata")
    List<EmployeeAttachmentSummary> list(@Parameter(hidden = true) CurrentAccount caller,
            @PathVariable UUID employeeId) {
        return service.list(caller, employeeId);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Upload PDF/PNG/JPEG/DOCX/XLSX, up to 5 MiB; scoped sensitive employee edit")
    EmployeeAttachmentSummary upload(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID employeeId,
            @RequestPart(name = "file", required = false) MultipartFile file) {
        return service.upload(caller, employeeId, file);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Download a private file as an attachment; never render inline")
    ResponseEntity<byte[]> download(@Parameter(hidden = true) CurrentAccount caller,
            @PathVariable UUID employeeId, @PathVariable UUID id) {
        EmployeeAttachmentService.Download file = service.download(caller, employeeId, id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .contentLength(file.bytes().length)
                .cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Disposition", ContentDisposition.attachment()
                        .filename(file.fileName(), StandardCharsets.UTF_8).build().toString())
                .body(file.bytes());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID employeeId,
            @PathVariable UUID id) {
        service.delete(caller, employeeId, id);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ProblemDetail tooLarge() {
        ApiException error = EmployeeAttachmentChecks.tooLarge();
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(error.getStatus(), error.getMessage());
        problem.setProperty("code", error.getCode());
        return problem;
    }
}
