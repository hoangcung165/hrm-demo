package com.hrmdemo.controller.employee;

import java.io.IOException;

import com.hrmdemo.dto.employee.EmployeeImportResponse;
import com.hrmdemo.dto.employee.EmployeeImportValidation;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.employee.EmployeeImportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartFile;

/**
 * Adding Employees from an Excel file (HRM-07): check it, then import it. The web sends the same file to both
 * calls; the server keeps nothing in between.
 */
@RestController
@RequestMapping("/api/employees/import")
@RequiredArgsConstructor
public class EmployeeImportController {

    private final EmployeeImportService importService;

    @PostMapping(path = "/validate", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Check an .xlsx file of new Employees (at most 5 MB and 1,000 rows); nothing is written; "
            + "needs EMPLOYEE_EDIT")
    EmployeeImportValidation validate(@Parameter(hidden = true) CurrentAccount caller,
            @RequestPart(name = "file", required = false) MultipartFile file) {
        return importService.validate(caller, fileName(file), bytesOf(file));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Import the new Employees of an .xlsx file, all or nothing; rows that already exist are "
            + "skipped; needs EMPLOYEE_EDIT")
    EmployeeImportResponse importFile(@Parameter(hidden = true) CurrentAccount caller,
            @RequestPart(name = "file", required = false) MultipartFile file,
            @Parameter(description = "Leave rows with errors out instead of refusing the whole file")
            @RequestParam(defaultValue = "false") boolean skipInvalid,
            @Parameter(description = "The checksum from the check; a different file is refused (import.file_changed)")
            @RequestParam(required = false) String checksum) {
        return importService.importFile(caller, fileName(file), bytesOf(file), skipInvalid, checksum);
    }

    /**
     * The servlet container refuses a file above {@code spring.servlet.multipart.max-file-size} while it parses the
     * request; uploads are parsed lazily, so the failure arrives here and gets the import's own code.
     */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ProblemDetail fileTooLarge() {
        ApiException ex = EmployeeImportService.fileTooLarge();
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(ex.getStatus(), ex.getMessage());
        problem.setProperty("code", ex.getCode());
        ex.getProperties().forEach(problem::setProperty);
        return problem;
    }

    private static String fileName(MultipartFile file) {
        return file == null ? null : file.getOriginalFilename();
    }

    /** Null without a file; the size is checked before the bytes are read. */
    private static byte[] bytesOf(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return null;
        }
        if (file.getSize() > EmployeeImportService.MAX_FILE_BYTES) {
            throw EmployeeImportService.fileTooLarge();
        }
        try {
            return file.getBytes();
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "import.file_invalid", "The file could not be read");
        }
    }
}
