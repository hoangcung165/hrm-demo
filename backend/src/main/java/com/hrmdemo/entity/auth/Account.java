package com.hrmdemo.entity.auth;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import com.hrmdemo.entity.LegalEntityOwned;
import com.hrmdemo.entity.SearchText;
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

    /**
     * The person's name as shown in the app. The Account's own until it is linked to an Employee (HRM-06),
     * whose name then takes over.
     */
    @Column(name = "full_name", nullable = false)
    private String fullName;

    /** Full name and email as {@link SearchText}; what the list search and the sort by name read. */
    @Column(name = "search_text", nullable = false)
    private String searchText;

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

    /** Set only for an Account seeded for the "Demo as…" switch; no API sets it. */
    @Enumerated(EnumType.STRING)
    @Column(name = "demo_persona", updatable = false)
    private DemoPersona demoPersona;

    @OneToMany(mappedBy = "account", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private Set<AccountRole> roles = new LinkedHashSet<>();

    public Account(String email, String fullName, String passwordHash, Instant createdAt) {
        this.email = email;
        this.fullName = fullName;
        this.searchText = SearchText.of(fullName, email);
        this.passwordHash = passwordHash;
        this.status = AccountStatus.ACTIVE;
        this.createdAt = createdAt;
    }

    /** The Account of a demo persona, with the persona's name, email and roles. For the seeder only. */
    public static Account forDemoPersona(DemoPersona persona, String passwordHash, Instant createdAt) {
        Account account = new Account(persona.email(), persona.fullName(), passwordHash, createdAt);
        account.demoPersona = persona;
        persona.roles().forEach(account::addRole);
        return account;
    }

    public boolean isDemoPersona() {
        return demoPersona != null;
    }

    public void addRole(Role role) {
        if (roleNames().contains(role.name())) {
            return;
        }
        roles.add(new AccountRole(this, role));
    }

    public boolean holds(Role role) {
        return roles.stream().anyMatch(held -> held.getRole() == role);
    }

    /** Makes the Account hold exactly these roles; a role it keeps stays the same row. */
    public void replaceRoles(Set<Role> newRoles) {
        roles.removeIf(held -> !newRoles.contains(held.getRole()));
        newRoles.forEach(this::addRole);
    }

    public Set<String> roleNames() {
        return roles.stream().map(r -> r.getRole().name()).collect(Collectors.toCollection(LinkedHashSet::new));
    }

    public void rename(String fullName) {
        this.fullName = fullName;
        this.searchText = SearchText.of(fullName, email);
    }

    public void changeEmail(String email) {
        this.email = email;
        this.searchText = SearchText.of(fullName, email);
    }

    /** Links the Account to an Employee, or removes the link with null. */
    public void linkEmployee(UUID employeeId) {
        this.employeeId = employeeId;
    }

    public void changePassword(String newPasswordHash) {
        this.passwordHash = newPasswordHash;
    }

    /** A locked Account cannot sign in; its sessions are ended by the service. */
    public void lock() {
        this.status = AccountStatus.LOCKED;
    }

    public void unlock() {
        this.status = AccountStatus.ACTIVE;
    }

    public boolean isActive() {
        return status == AccountStatus.ACTIVE;
    }
}
