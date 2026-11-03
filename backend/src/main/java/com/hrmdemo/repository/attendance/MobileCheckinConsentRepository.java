package com.hrmdemo.repository.attendance;

import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.entity.attendance.MobileCheckinConsent;
import org.springframework.data.jpa.repository.JpaRepository;

/** Consents to mobile check-in, one per Employee; queries are filtered by Legal entity (ADR 0003). */
public interface MobileCheckinConsentRepository extends JpaRepository<MobileCheckinConsent, UUID> {

    Optional<MobileCheckinConsent> findByEmployeeId(UUID employeeId);

    /** How many Employees have a consent in force. */
    long countByWithdrawnAtIsNull();
}
