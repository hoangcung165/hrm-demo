package com.hrmdemo.repository.employee;

import com.hrmdemo.entity.employee.Resignation;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResignationRepository extends JpaRepository<Resignation, UUID> {
    Optional<Resignation> findByEmployeeId(UUID employeeId);
    boolean existsByEmployeeId(UUID employeeId);

    /** Departures whose last working day falls in the range, both ends included. */
    List<Resignation> findByLastWorkingDayBetween(LocalDate from, LocalDate to);
}
