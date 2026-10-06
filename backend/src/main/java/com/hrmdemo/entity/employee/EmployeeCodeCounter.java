package com.hrmdemo.entity.employee;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * The last number issued as a Mã nhân viên, one row per Legal entity. Keyed by the Legal entity itself, so it
 * is not a {@code LegalEntityOwned} root entity: the service passes the current Legal entity's id.
 */
@Entity
@Table(name = "employee_code_counter")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EmployeeCodeCounter {

    @Id
    @Column(name = "legal_entity_id")
    private UUID legalEntityId;

    @Column(name = "last_value", nullable = false)
    private int lastValue;

    public EmployeeCodeCounter(UUID legalEntityId, int lastValue) {
        this.legalEntityId = legalEntityId;
        this.lastValue = lastValue;
    }

    /** Moves the counter to a number that was just issued. */
    public void issued(int value) {
        this.lastValue = value;
    }
}
