package com.hrmdemo.repository.employee;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.entity.employee.EmployeeBankAccount;
import org.springframework.data.jpa.repository.JpaRepository;

/** Hibernate tenant filtering applies to this tenant-owned entity. */
public interface EmployeeBankAccountRepository extends JpaRepository<EmployeeBankAccount, UUID> {
    List<EmployeeBankAccount> findByEmployeeIdOrderByCreatedAtAsc(UUID employeeId);
    Optional<EmployeeBankAccount> findByIdAndEmployeeId(UUID id, UUID employeeId);
}
