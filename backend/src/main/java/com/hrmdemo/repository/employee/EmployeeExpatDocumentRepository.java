package com.hrmdemo.repository.employee;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.entity.employee.EmployeeExpatDocument;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeExpatDocumentRepository extends JpaRepository<EmployeeExpatDocument, UUID> {
    List<EmployeeExpatDocument> findByEmployeeIdOrderByExpiresAtAsc(UUID employeeId);
    Optional<EmployeeExpatDocument> findByIdAndEmployeeId(UUID id, UUID employeeId);
}
