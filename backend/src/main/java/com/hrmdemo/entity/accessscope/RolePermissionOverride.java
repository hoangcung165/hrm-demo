package com.hrmdemo.entity.accessscope;

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
 * One difference between a role's permissions in this company and the defaults in code (Phạm vi truy cập):
 * {@code granted} true adds the permission, false takes it away. Role and permission are kept as names, so a
 * row written by a release that knew more names still loads; unknown names are ignored by the reader.
 */
@Entity
@Table(name = "role_permission_override")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RolePermissionOverride extends LegalEntityOwned {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, updatable = false)
    private String role;

    @Column(nullable = false, updatable = false)
    private String permission;

    @Column(nullable = false, updatable = false)
    private boolean granted;

    public RolePermissionOverride(String role, String permission, boolean granted) {
        this.role = role;
        this.permission = permission;
        this.granted = granted;
    }
}
