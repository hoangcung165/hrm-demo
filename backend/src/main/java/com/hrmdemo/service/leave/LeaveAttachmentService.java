package com.hrmdemo.service.leave;

import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.util.HexFormat;
import java.util.UUID;

import com.hrmdemo.dto.leave.LeaveAttachmentSummary;
import com.hrmdemo.entity.leave.LeaveAttachment;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.leave.LeaveAttachmentRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.approval.ApprovalRequestService;
import com.hrmdemo.service.employee.EmployeeAttachmentChecks;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * Files for a Đơn nghỉ: the Employee uploads one (PDF, PNG, JPEG, DOCX or XLSX up to 5 MiB, checked by its content),
 * then names its id when sending the request. Same checks as the files of a profile.
 */
@Service
@RequiredArgsConstructor
public class LeaveAttachmentService {

    private final LeaveAttachmentRepository attachments;
    private final Clock clock;

    @Transactional
    public LeaveAttachmentSummary upload(CurrentAccount caller, MultipartFile file) {
        UUID me = ApprovalRequestService.requireEmployee(caller);
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "attachment.file_missing", "No file supplied");
        }
        if (file.getSize() > EmployeeAttachmentChecks.MAX_BYTES) {
            throw EmployeeAttachmentChecks.tooLarge();
        }
        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "attachment.file_invalid", "Cannot read file");
        }
        EmployeeAttachmentChecks.Checked checked = EmployeeAttachmentChecks.validate(file.getOriginalFilename(),
                file.getContentType(), content);
        LeaveAttachment saved = attachments.save(new LeaveAttachment(me, checked.fileName(), checked.contentType(),
                content, sha256(content), clock.instant()));
        return new LeaveAttachmentSummary(saved.getId(), saved.getFileName(), saved.getContentType(),
                saved.getSizeBytes(), saved.getCreatedAt());
    }

    private static String sha256(byte[] content) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
