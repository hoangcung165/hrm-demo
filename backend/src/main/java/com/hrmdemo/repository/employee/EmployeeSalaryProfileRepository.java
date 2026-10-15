package com.hrmdemo.repository.employee;

import com.hrmdemo.entity.employee.EmployeeSalaryProfile;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeSalaryProfileRepository extends JpaRepository<EmployeeSalaryProfile, UUID> {
    List<EmployeeSalaryProfile> findByEmployeeIdOrderByEffectiveOnAsc(UUID employeeId);
    boolean existsBySourceContractId(UUID sourceContractId);
}
