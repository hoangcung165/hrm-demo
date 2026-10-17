package com.hrmdemo.repository.employee;

import com.hrmdemo.entity.employee.ProbationEvaluation;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProbationEvaluationRepository extends JpaRepository<ProbationEvaluation, UUID> {
    List<ProbationEvaluation> findByEmployeeIdOrderByEndsOnDescCreatedAtDesc(UUID employeeId);
    List<ProbationEvaluation> findBySourceContractIdOrderByEndsOnDescCreatedAtDesc(UUID sourceContractId);
    boolean existsBySourceContractId(UUID sourceContractId);
}
