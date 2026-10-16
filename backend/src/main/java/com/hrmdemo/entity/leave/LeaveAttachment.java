package com.hrmdemo.entity.leave;

import java.time.Instant;
import java.util.UUID;

import com.hrmdemo.entity.LegalEntityOwned;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * A file for a Đơn nghỉ (a medical certificate…). The Employee uploads it first; sending the request attaches it.
 * Lists read only its metadata; never serialize this entity.
 */
@Entity
@Table(name = "leave_attachment")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LeaveAttachment extends LegalEntityOwned {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "employee_id", nullable = false, updatable = false)
    private UUID employeeId;

    @Column(name = "leave_request_id")
    private UUID leaveRequestId;

    @Column(name = "file_name", nullable = false, updatable = false)
    private String fileName;

    @Column(name = "content_type", nullable = false, updatable = false)
    private String contentType;

    @Column(name = "size_bytes", nullable = false, updatable = false)
    private int sizeBytes;

    @Column(nullable = false, updatable = false)
    private String sha256;

    /** PostgreSQL bytea, not @Lob (which maps to a large-object OID). */
    @JdbcTypeCode(SqlTypes.VARBINARY)
    @Column(nullable = false, columnDefinition = "bytea", updatable = false)
    private byte[] content;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public LeaveAttachment(UUID employeeId, String fileName, String contentType, byte[] content, String sha256,
            Instant now) {
        this.employeeId = employeeId;
        this.fileName = fileName;
        this.contentType = contentType;
        this.content = content;
        this.sizeBytes = content.length;
        this.sha256 = sha256;
        this.createdAt = now;
    }

    public void attachTo(UUID requestId) {
        leaveRequestId = requestId;
    }

    public void detach() {
        leaveRequestId = null;
    }
}
