package com.hrmdemo.service.employee;

import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.employee.EmployeeAttachmentSummary;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.EmployeeAttachment;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.employee.EmployeeAttachmentRepository;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/** Employee-scoped private files: authorization always precedes attachment lookup. */
@Service
@RequiredArgsConstructor
public class EmployeeAttachmentService {
    private final EmployeeRepository employees;
    private final EmployeeAttachmentRepository attachments;
    private final AccessScopeService accessScopes;
    private final Clock clock;

    public record Download(String fileName, byte[] bytes) {}

    private static ApiException missing() {
        return new ApiException(HttpStatus.NOT_FOUND, "attachment.not_found", "Attachment not found");
    }

    private void authorize(CurrentAccount caller, UUID employeeId, boolean edit) {
        AccessScope scope = accessScopes.scopeOf(caller);
        boolean own = employeeId.equals(caller.employeeId());
        if (edit) {
            scope.require(Permission.EMPLOYEE_EDIT);
            scope.require(Permission.EMPLOYEE_SENSITIVE_VIEW);
        } else if (!own) {
            scope.require(Permission.EMPLOYEE_VIEW);
            scope.require(Permission.EMPLOYEE_SENSITIVE_VIEW);
        }
        Employee employee = employees.findById(employeeId).orElseThrow(EmployeeAttachmentService::missing);
        if (edit || !own) scope.requireEmployee(employee.getId(), employee.getOrgUnitId());
    }

    @Transactional(readOnly = true)
    public List<EmployeeAttachmentSummary> list(CurrentAccount caller, UUID employeeId) {
        authorize(caller, employeeId, false);
        return attachments.summaries(employeeId);
    }

    @Transactional
    public EmployeeAttachmentSummary upload(CurrentAccount caller, UUID employeeId, MultipartFile file) {
        authorize(caller, employeeId, true);
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "attachment.file_missing", "No file supplied");
        }
        if (file.getSize() > EmployeeAttachmentChecks.MAX_BYTES) throw EmployeeAttachmentChecks.tooLarge();
        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "attachment.file_invalid", "Cannot read file");
        }
        EmployeeAttachmentChecks.Checked checked = EmployeeAttachmentChecks.validate(
                file.getOriginalFilename(), file.getContentType(), content);
        EmployeeAttachment saved = attachments.save(new EmployeeAttachment(employeeId,
                checked.fileName(), checked.contentType(), content, sha256(content), caller.id(), clock.instant()));
        return summary(saved);
    }

    @Transactional(readOnly = true)
    public Download download(CurrentAccount caller, UUID employeeId, UUID attachmentId) {
        authorize(caller, employeeId, false);
        EmployeeAttachment file = attachments.findByIdAndEmployeeId(attachmentId, employeeId)
                .orElseThrow(EmployeeAttachmentService::missing);
        return new Download(file.getFileName(), file.getContent().clone());
    }

    @Transactional
    public void delete(CurrentAccount caller, UUID employeeId, UUID attachmentId) {
        authorize(caller, employeeId, true);
        EmployeeAttachment file = attachments.findByIdAndEmployeeId(attachmentId, employeeId)
                .orElseThrow(EmployeeAttachmentService::missing);
        attachments.delete(file);
    }

    private static EmployeeAttachmentSummary summary(EmployeeAttachment file) {
        return new EmployeeAttachmentSummary(file.getId(), file.getFileName(), file.getContentType(),
                file.getContentLength(), file.getSha256(), file.getUploadedAt());
    }

    private static String sha256(byte[] content) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
