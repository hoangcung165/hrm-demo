package com.hrmdemo.controller.legalentity;

import java.io.IOException;
import java.time.Duration;

import com.hrmdemo.dto.legalentity.CompanyInfoRequest;
import com.hrmdemo.dto.legalentity.CompanyInfoResponse;
import com.hrmdemo.dto.legalentity.CompanyLogo;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.legalentity.LegalEntityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartFile;

/**
 * Company info of the single Pháp nhân (Legal entity), called "Company" in the UI and in this API.
 * There is no endpoint to create, list, delete or switch Legal entities (ADR 0003).
 */
@RestController
@RequestMapping("/api/company")
@RequiredArgsConstructor
public class CompanyController {

    private final LegalEntityService legalEntityService;

    @GetMapping
    @Operation(summary = "Company info; any signed-in Account")
    CompanyInfoResponse companyInfo() {
        return legalEntityService.companyInfo();
    }

    @PutMapping
    @Operation(summary = "Update company info; needs COMPANY_EDIT")
    CompanyInfoResponse updateCompanyInfo(@Parameter(hidden = true) CurrentAccount account,
            @Valid @RequestBody CompanyInfoRequest request) {
        return legalEntityService.updateCompanyInfo(account, request);
    }

    @PutMapping(path = "/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload the logo (PNG, JPEG or WebP, at most 1 MB); needs COMPANY_EDIT")
    CompanyInfoResponse storeLogo(@Parameter(hidden = true) CurrentAccount account,
            @RequestPart(name = "file", required = false) MultipartFile file) {
        if (file != null && file.getSize() > LegalEntityService.MAX_LOGO_BYTES) {
            throw LegalEntityService.logoTooLarge();
        }
        return legalEntityService.storeLogo(account, file == null ? null : bytesOf(file));
    }

    @DeleteMapping("/logo")
    @Operation(summary = "Remove the logo; needs COMPANY_EDIT")
    CompanyInfoResponse removeLogo(@Parameter(hidden = true) CurrentAccount account) {
        return legalEntityService.removeLogo(account);
    }

    @GetMapping("/logo")
    @Operation(summary = "The logo image; public", responses = {
            @ApiResponse(responseCode = "200", content = {
                    @Content(mediaType = "image/png", schema = @Schema(type = "string", format = "binary")),
                    @Content(mediaType = "image/jpeg", schema = @Schema(type = "string", format = "binary")),
                    @Content(mediaType = "image/webp", schema = @Schema(type = "string", format = "binary"))}),
            @ApiResponse(responseCode = "404", description = "company.logo_not_found",
                    content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemDetail.class)))})
    ResponseEntity<byte[]> logo(
            @Parameter(description = "Logo version from logoUrl; with it the response may be cached for a year")
            @RequestParam(name = "v", required = false) String version) {
        CompanyLogo logo = legalEntityService.logo();
        // A URL with a version never changes its content; without one the browser must ask again each time.
        CacheControl cacheControl = version == null
                ? CacheControl.noCache()
                : CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(logo.contentType()))
                .cacheControl(cacheControl)
                .eTag("\"" + logo.version() + "\"")
                // The stored type comes from the file's own bytes; browsers must not guess another one.
                .header("X-Content-Type-Options", "nosniff")
                .body(logo.content());
    }

    /**
     * The servlet container rejects a file above {@code spring.servlet.multipart.max-file-size} while the
     * request is parsed. Uploads are parsed lazily ({@code resolve-lazily}), so that failure arrives here
     * and gets the same code as the size check in the service.
     */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ProblemDetail logoTooLarge() {
        ApiException ex = LegalEntityService.logoTooLarge();
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(ex.getStatus(), ex.getMessage());
        problem.setProperty("code", ex.getCode());
        return problem;
    }

    private static byte[] bytesOf(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "company.logo_missing",
                    "Logo file could not be read");
        }
    }
}
