package com.hrmdemo.entity.auth;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import com.hrmdemo.entity.LegalEntityOwned;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Tài khoản: the identity used to sign in. Glossary: docs/contexts/org/CONTEXT.md. */
@Entity
@Table(name = "account")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Account extends LegalEntityOwned {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AccountStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    /** The Nhân viên (Employee) this Account belongs to; null for a system administration Account. */
    @Column(name = "employee_id")
    private UUID employeeId;

    @OneToMany(mappedBy = "account", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private Set<AccountRole> roles = new LinkedHashSet<>();

    public Account(String email, String passwordHash, Instant createdAt) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.status = AccountStatus.ACTIVE;
        this.createdAt = createdAt;
    }

    public void addRole(Role role) {
        if (roleNames().contains(role.name())) {
            return;
        }
        roles.add(new AccountRole(this, role));
    }

    public Set<String> roleNames() {
        return roles.stream().map(r -> r.getRole().name()).collect(Collectors.toCollection(LinkedHashSet::new));
    }

    /** Links the Account to an Employee, or removes the link with null. */
    public void linkEmployee(UUID employeeId) {
        this.employeeId = employeeId;
    }

    public void changePassword(String newPasswordHash) {
        this.passwordHash = newPasswordHash;
    }

    public boolean isActive() {
        return status == AccountStatus.ACTIVE;
    }
}
