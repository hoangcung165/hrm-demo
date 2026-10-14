package com.hrmdemo.repository.employee;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.entity.employee.EmployeeCertificate;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeCertificateRepository extends JpaRepository<EmployeeCertificate, UUID> {
    List<EmployeeCertificate> findByEmployeeIdOrderByCreatedAtAsc(UUID employeeId);
    Optional<EmployeeCertificate> findByIdAndEmployeeId(UUID id, UUID employeeId);
}
