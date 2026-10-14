package com.hrmdemo.entity.employee;

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

/** Tenant-owned private binary attachment. List endpoints select only metadata; never serialize this entity. */
@Entity
@Table(name = "employee_attachment")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EmployeeAttachment extends LegalEntityOwned {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "employee_id", nullable = false, updatable = false)
    private UUID employeeId;

    @Column(name = "file_name", nullable = false, length = 180)
    private String fileName;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "content_length", nullable = false)
    private int contentLength;

    @Column(name = "sha256", nullable = false, length = 64, updatable = false)
    private String sha256;

    @Column(name = "uploaded_by", nullable = false, updatable = false)
    private UUID uploadedBy;

    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private Instant uploadedAt;

    /** PostgreSQL bytea, not @Lob (which maps to PostgreSQL large-object OID). */
    @JdbcTypeCode(SqlTypes.VARBINARY)
    @Column(name = "content", nullable = false, columnDefinition = "bytea", updatable = false)
    private byte[] content;

    public EmployeeAttachment(UUID employeeId, String fileName, String contentType, byte[] content,
            String sha256, UUID uploadedBy, Instant now) {
        this.employeeId = employeeId;
        this.fileName = fileName;
        this.contentType = contentType;
        this.contentLength = content.length;
        this.sha256 = sha256;
        this.uploadedBy = uploadedBy;
        this.uploadedAt = now;
        this.content = content.clone();
    }
}
