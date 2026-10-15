package com.hrmdemo.controller.employee;

import com.hrmdemo.dto.employee.ContractTemplateSummary;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.employee.ContractDocumentService;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
public class ContractDocumentController {
    private final ContractDocumentService service;

    @GetMapping("/api/contract-templates/{type}")
    public List<ContractTemplateSummary> list(CurrentAccount caller,@PathVariable String type) {
        return service.list(caller,type);
    }

    @PostMapping(value="/api/contract-templates/{type}",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ContractTemplateSummary upload(CurrentAccount caller,@PathVariable String type,
            @RequestPart("file") MultipartFile file) {
        return service.upload(caller,type,file);
    }

    @GetMapping("/api/employees/{employeeId}/contracts/{id}/export")
    public ResponseEntity<byte[]> export(CurrentAccount caller,@PathVariable UUID employeeId,
            @PathVariable UUID id,@RequestParam(defaultValue="docx") String format) {
        ContractDocumentService.Export output = service.export(caller,employeeId,id,format);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(output.contentType()))
                .cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options","nosniff")
                .header("Content-Disposition",ContentDisposition.attachment()
                        .filename(output.fileName(),StandardCharsets.UTF_8).build().toString())
                .contentLength(output.bytes().length).body(output.bytes());
    }
}
