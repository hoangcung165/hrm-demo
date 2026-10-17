package com.hrmdemo.repository.employee;

import com.hrmdemo.entity.employee.WorkDecision;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkDecisionRepository extends JpaRepository<WorkDecision, UUID> {
    List<WorkDecision> findByEmployeeIdOrderByEffectiveOnDescCreatedAtDesc(UUID employeeId);
    boolean existsByDecisionNumber(String decisionNumber);
}
