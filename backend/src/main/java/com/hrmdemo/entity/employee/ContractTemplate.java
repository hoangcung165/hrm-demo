package com.hrmdemo.entity.employee;

import com.hrmdemo.entity.LegalEntityOwned;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "contract_template")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ContractTemplate extends LegalEntityOwned {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "contract_type",nullable = false,updatable = false) private String contractType;
    @Column(nullable = false,updatable = false) private int version;
    @Column(name = "file_name",nullable = false,updatable = false) private String fileName;
    @JdbcTypeCode(SqlTypes.VARBINARY)
    @Column(nullable = false,updatable = false,columnDefinition = "bytea")
    private byte[] content;
    @Column(nullable = false) private boolean active;
    @Column(name = "uploaded_by",nullable = false,updatable = false) private UUID uploadedBy;
    @Column(name = "uploaded_at",nullable = false,updatable = false) private Instant uploadedAt;

    public ContractTemplate(String type, int version, String name, byte[] bytes, UUID user, Instant now) {
        this.contractType = type;
        this.version = version;
        this.fileName = name;
        this.content = bytes.clone();
        this.uploadedBy = user;
        this.uploadedAt = now;
        this.active = true;
    }
    public void deactivate() { this.active = false; }
}
