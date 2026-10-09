package com.hrmdemo.entity.approval;

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
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ListIndexBase;

/**
 * A company's own Luồng phê duyệt for one request type, in place of the default in code. Request type, rule and
 * role are kept as names so a row written by a release that knew more names still loads; the service maps them.
 */
@Entity
@Table(name = "approval_flow_setting")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ApprovalFlowSetting extends LegalEntityOwned {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "request_type", nullable = false, updatable = false)
    private String requestType;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "approval_flow_setting_level", joinColumns = @JoinColumn(name = "setting_id"))
    @OrderColumn(name = "position", nullable = false)
    @ListIndexBase(1)
    private List<Level> levels = new ArrayList<>();

    @Column(name = "auto_approve_days")
    private Integer autoApproveDays;

    @Column(name = "delegation_allowed", nullable = false)
    private boolean delegationAllowed;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "updated_by")
    private UUID updatedBy;

    public ApprovalFlowSetting(String requestType) {
        this.requestType = requestType;
    }

    public void update(List<Level> newLevels, Integer newAutoApproveDays, boolean newDelegationAllowed,
            UUID accountId, Instant at) {
        levels.clear();
        levels.addAll(newLevels);
        autoApproveDays = newAutoApproveDays;
        delegationAllowed = newDelegationAllowed;
        updatedBy = accountId;
        updatedAt = at;
    }

    /** One level; {@code role} only for the ROLE rule. */
    @Embeddable
    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    public static class Level {

        @Column(nullable = false)
        private String rule;

        @Column
        private String role;

        public Level(String rule, String role) {
            this.rule = rule;
            this.role = role;
        }
    }
}
