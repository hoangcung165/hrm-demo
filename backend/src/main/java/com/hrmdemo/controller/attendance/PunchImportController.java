package com.hrmdemo.controller.attendance;

import java.io.IOException;
import java.util.List;

import com.hrmdemo.dto.attendance.PunchImportItem;
import com.hrmdemo.dto.attendance.PunchImportResponse;
import com.hrmdemo.dto.attendance.PunchImportValidation;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.attendance.PunchImportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartFile;

/**
 * Importing the Log quẹt thẻ (HRM-23): check a file, then import it. The web sends the same file to both calls; the
 * server keeps nothing in between.
 */
@RestController
@RequestMapping("/api/attendance/punch-imports")
@RequiredArgsConstructor
public class PunchImportController {

    private final PunchImportService importService;

    @GetMapping
    @Operation(summary = "The latest imports of the punch log, newest first (limit 1 to 20, default 3); needs "
            + "ATTENDANCE_IMPORT")
    List<PunchImportItem> recent(@Parameter(hidden = true) CurrentAccount caller,
            @RequestParam(defaultValue = "3") int limit) {
        return importService.recent(caller, limit);
    }

    @PostMapping(path = "/check", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Check a .csv or .xlsx punch log (at most 5 MB and 50,000 rows); nothing is written; "
            + "needs ATTENDANCE_IMPORT")
    PunchImportValidation check(@Parameter(hidden = true) CurrentAccount caller,
            @RequestPart(name = "file", required = false) MultipartFile file) {
        return importService.validate(caller, fileName(file), bytesOf(file));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Import a .csv or .xlsx punch log; punches already stored are skipped, so the same file "
            + "may be imported again; needs ATTENDANCE_IMPORT")
    PunchImportResponse importFile(@Parameter(hidden = true) CurrentAccount caller,
            @RequestPart(name = "file", required = false) MultipartFile file,
            @Parameter(description = "Leave rows with errors out instead of refusing the whole file")
            @RequestParam(defaultValue = "false") boolean skipInvalid,
            @Parameter(description = "The checksum from the check; a different file is refused (import.file_changed)")
            @RequestParam(required = false) String checksum) {
        return importService.importFile(caller, fileName(file), bytesOf(file), skipInvalid, checksum);
    }

    /** The servlet container's own upload limit is reached while the request is parsed; give it the import's code. */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ProblemDetail fileTooLarge() {
        ApiException ex = PunchImportService.fileTooLarge();
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
        if (file.getSize() > PunchImportService.MAX_FILE_BYTES) {
            throw PunchImportService.fileTooLarge();
        }
        try {
            return file.getBytes();
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "import.file_invalid", "The file cannot be read");
        }
    }
}
