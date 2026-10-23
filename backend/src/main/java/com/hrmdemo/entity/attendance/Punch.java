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
 * Lần quẹt: one raw punch of an Employee at an instant. At most one per Employee per instant (unique key), which is
 * what makes importing a file twice safe. Rows are written by a native insert that skips what is already there (see
 * {@code PunchImportService}), so this class is for reading. A punch is never changed.
 */
@Entity
@Table(name = "punch")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Punch extends LegalEntityOwned {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "employee_id", nullable = false, updatable = false)
    private UUID employeeId;

    @Column(name = "punched_at", nullable = false, updatable = false)
    private Instant punchedAt;

    /** The machine the punch came from, when the file says. */
    @Column(updatable = false)
    private String device;

    @Column(name = "import_id", updatable = false)
    private UUID importId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
