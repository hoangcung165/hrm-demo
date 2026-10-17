package com.hrmdemo.entity.employee;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.hrmdemo.entity.LegalEntityOwned;
import com.hrmdemo.entity.SearchText;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Nhân viên: a person who works for the company. Glossary: docs/contexts/people/CONTEXT.md.
 * The rules (code, references, masking, data scope) live in {@code EmployeeService}.
 */
@Entity
@Table(name = "employee")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Employee extends LegalEntityOwned {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Mã nhân viên, e.g. {@code NV00042}: issued once, never changed. */
    @Column(nullable = false, updatable = false)
    private String code;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    /** Full name and code as {@link SearchText}. */
    @Column(name = "search_text", nullable = false)
    private String searchText;

    @Column(name = "date_of_birth", nullable = false)
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Gender gender;

    @Column(name = "personal_email")
    private String personalEmail;

    private String phone;

    private String address;

    @Column(name = "emergency_contact_name")
    private String emergencyContactName;

    @Column(name = "emergency_contact_relationship")
    private String emergencyContactRelationship;

    @Column(name = "emergency_contact_phone")
    private String emergencyContactPhone;

    @Column(name = "id_number", nullable = false)
    private String idNumber;

    @Column(name = "id_issue_date")
    private LocalDate idIssueDate;

    @Column(name = "id_issue_place")
    private String idIssuePlace;

    @Column(name = "tax_code")
    private String taxCode;

    @Column(name = "social_insurance_number")
    private String socialInsuranceNumber;

    /** ISO alpha-2 country code. Null when nationality has not been recorded. */
    @Column(name = "nationality")
    private String nationality;

    /** Null: directly under the company. */
    @Column(name = "org_unit_id")
    private UUID orgUnitId;

    @Column(name = "position_id", nullable = false)
    private UUID positionId;

    /** Quản lý trực tiếp chosen by HR; null: follows the unit head. */
    @Column(name = "manager_id")
    private UUID managerId;

    @Column(name = "hire_date", nullable = false)
    private LocalDate hireDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EmployeeStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Employee(String code, EmployeePersonalFields personal, EmployeeIdentityFields identity,
            EmployeeJobFields job, Instant now) {
        this.code = code;
        this.createdAt = now;
        applyPersonal(personal);
        applyIdentity(identity);
        applyJob(job);
        this.updatedAt = now;
    }

    public boolean isActive() {
        return status.isActive();
    }

    /** Replaces the full name and the "Cá nhân" fields; the code stays. */
    public void editPersonal(EmployeePersonalFields personal, Instant now) {
        applyPersonal(personal);
        this.updatedAt = now;
    }

    /** Replaces the identity numbers and the CCCD issue date and place. */
    public void editIdentity(EmployeeIdentityFields identity, Instant now) {
        applyIdentity(identity);
        this.updatedAt = now;
    }

    /** Replaces the "Công việc" fields. The service has checked the status change and the references. */
    public void editJob(EmployeeJobFields job, Instant now) {
        applyJob(job);
        this.updatedAt = now;
    }

    /** The resignation service alone may end this Employee's employment. */
    public void resign(Instant now) {
        this.status = EmployeeStatus.INACTIVE;
        this.updatedAt = now;
    }

    /** HRM-08 updates nationality without replacing the identity or personal sections. */
    public void setNationality(String nationality, Instant now) {
        this.nationality = nationality;
        this.updatedAt = now;
    }

    private void applyPersonal(EmployeePersonalFields personal) {
        this.fullName = personal.fullName();
        this.searchText = SearchText.of(personal.fullName(), code);
        this.dateOfBirth = personal.dateOfBirth();
        this.gender = personal.gender();
        this.personalEmail = personal.personalEmail();
        this.phone = personal.phone();
        this.address = personal.address();
        this.emergencyContactName = personal.emergencyContactName();
        this.emergencyContactRelationship = personal.emergencyContactRelationship();
        this.emergencyContactPhone = personal.emergencyContactPhone();
    }

    private void applyIdentity(EmployeeIdentityFields identity) {
        this.idNumber = identity.idNumber();
        this.idIssueDate = identity.idIssueDate();
        this.idIssuePlace = identity.idIssuePlace();
        this.taxCode = identity.taxCode();
        this.socialInsuranceNumber = identity.socialInsuranceNumber();
    }

    private void applyJob(EmployeeJobFields job) {
        this.orgUnitId = job.orgUnitId();
        this.positionId = job.positionId();
        this.managerId = job.managerId();
        this.hireDate = job.hireDate();
        this.status = job.status();
    }
}
