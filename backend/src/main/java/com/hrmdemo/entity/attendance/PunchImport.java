package com.hrmdemo.entity.attendance;

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

/**
 * One import of a punch log file: who, when, which file and what became of its rows. Written with the provisional
 * counts before its punches (they point at it) and given the result once, in the same transaction.
 */
@Entity
@Table(name = "punch_import")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PunchImport extends LegalEntityOwned {

    @Id
    private UUID id;

    @Column(name = "file_name")
    private String fileName;

    @Column(nullable = false)
    private String checksum;

    @Column(name = "imported_by", nullable = false)
    private UUID importedBy;

    @Column(name = "rows_read", nullable = false)
    private int rowsRead;

    @Column(name = "rows_stored", nullable = false)
    private int rowsStored;

    @Column(name = "rows_existing", nullable = false)
    private int rowsExisting;

    @Column(name = "rows_refused", nullable = false)
    private int rowsRefused;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public PunchImport(UUID id, String fileName, String checksum, UUID importedBy, int rowsRead, int rowsStored,
            int rowsExisting, int rowsRefused, Instant now) {
        this.id = id;
        this.fileName = fileName;
        this.checksum = checksum;
        this.importedBy = importedBy;
        this.rowsRead = rowsRead;
        this.rowsStored = rowsStored;
        this.rowsExisting = rowsExisting;
        this.rowsRefused = rowsRefused;
        this.createdAt = now;
        this.updatedAt = now;
    }

    /** The punches the import stored and the ones that were stored already. */
    public void recordResult(int stored, int existing) {
        this.rowsStored = stored;
        this.rowsExisting = existing;
        this.updatedAt = this.createdAt;
    }
}
