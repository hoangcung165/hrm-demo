package com.hrmdemo.entity.profileupdate;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.entity.LegalEntityOwned;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Cập nhật hồ sơ: the content of a Yêu cầu phê duyệt of type PROFILE_UPDATE, under the same id. Fields are the
 * names of {@code ContactField}.
 */
@Entity
@Table(name = "profile_update_request")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProfileUpdateRequest extends LegalEntityOwned {

    @Id
    private UUID id;

    @Column(name = "employee_id", nullable = false, updatable = false)
    private UUID employeeId;

    private String note;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "profile_update_change", joinColumns = @JoinColumn(name = "request_id"))
    private List<Change> changes = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public ProfileUpdateRequest(UUID id, UUID employeeId, String note, List<Change> changes, Instant now) {
        this.id = id;
        this.employeeId = employeeId;
        this.note = note;
        this.changes.addAll(changes);
        this.createdAt = now;
        this.updatedAt = now;
    }

    /** The sender's new proposal while the request was returned to them. */
    public void replace(String newNote, List<Change> newChanges, Instant now) {
        note = newNote;
        changes.clear();
        changes.addAll(newChanges);
        updatedAt = now;
    }

    @Embeddable
    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    public static class Change {

        @Column(nullable = false)
        private String field;

        @Column(name = "old_value")
        private String oldValue;

        @Column(name = "new_value")
        private String newValue;

        public Change(String field, String oldValue, String newValue) {
            this.field = field;
            this.oldValue = oldValue;
            this.newValue = newValue;
        }
    }
}
