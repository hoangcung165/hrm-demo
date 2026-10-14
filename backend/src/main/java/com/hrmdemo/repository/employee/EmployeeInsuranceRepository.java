package com.hrmdemo.repository.employee;

import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.entity.employee.EmployeeInsurance;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeInsuranceRepository extends JpaRepository<EmployeeInsurance, UUID> {
    Optional<EmployeeInsurance> findByEmployeeId(UUID employeeId);
}
