package com.hrmdemo.entity.employee;

import java.time.Instant;
import java.time.LocalDate;
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

/** Insurance metadata; the BHXH number remains on Employee and contribution salary on Salary Profile. */
@Entity
@Table(name = "employee_insurance")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EmployeeInsurance extends LegalEntityOwned {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "employee_id", nullable = false, updatable = false)
    private UUID employeeId;

    @Column(name = "participation_date")
    private LocalDate participationDate;

    @Column(name = "health_registration_place")
    private String healthRegistrationPlace;

    @Column(name = "health_insurance_number")
    private String healthInsuranceNumber;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public EmployeeInsurance(UUID employeeId, LocalDate participationDate,
            String healthRegistrationPlace, String healthInsuranceNumber, Instant now) {
        this.employeeId = employeeId;
        createdAt = now;
        edit(participationDate, healthRegistrationPlace, healthInsuranceNumber, now);
    }

    public void edit(LocalDate participationDate, String healthRegistrationPlace,
            String healthInsuranceNumber, Instant now) {
        this.participationDate = participationDate;
        this.healthRegistrationPlace = healthRegistrationPlace;
        this.healthInsuranceNumber = healthInsuranceNumber;
        this.updatedAt = now;
    }
}
