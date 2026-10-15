package com.hrmdemo.repository.employee;

import com.hrmdemo.entity.employee.EmploymentContract;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmploymentContractRepository extends JpaRepository<EmploymentContract, UUID> {
    List<EmploymentContract> findByEmployeeIdOrderByStartsOnDesc(UUID employeeId);
    boolean existsByContractNumber(String contractNumber);

}
