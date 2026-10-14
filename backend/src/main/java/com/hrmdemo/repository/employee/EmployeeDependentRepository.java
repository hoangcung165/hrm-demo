package com.hrmdemo.repository.employee;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.entity.employee.EmployeeDependent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeDependentRepository extends JpaRepository<EmployeeDependent, UUID> {
    List<EmployeeDependent> findByEmployeeIdOrderByEffectiveFromDesc(UUID employeeId);
    Optional<EmployeeDependent> findByIdAndEmployeeId(UUID id, UUID employeeId);
}
