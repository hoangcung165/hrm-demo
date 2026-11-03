package com.hrmdemo.entity.attendance;

import java.time.Instant;
import java.util.UUID;

import com.hrmdemo.entity.LegalEntityOwned;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * The front-camera photo of a mobile Lần quẹt (HRM-39), kept as long as the punch, so never changed or deleted. Its id
 * is the punch's. Only the Employee and people whose data scope covers them may see it; never serialize this entity.
 */
@Entity
@Table(name = "punch_photo")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PunchPhoto extends LegalEntityOwned {

    @Id
    @Column(name = "punch_id", updatable = false)
    private UUID punchId;

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

    public PunchPhoto(UUID punchId, String contentType, byte[] content, String sha256, Instant now) {
        this.punchId = punchId;
        this.contentType = contentType;
        this.content = content;
        this.sizeBytes = content.length;
        this.sha256 = sha256;
        this.createdAt = now;
    }
}
