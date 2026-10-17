package com.hrmdemo.repository.employee;

import com.hrmdemo.entity.employee.Resignation;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResignationRepository extends JpaRepository<Resignation, UUID> {
    Optional<Resignation> findByEmployeeId(UUID employeeId);
    boolean existsByEmployeeId(UUID employeeId);
}
