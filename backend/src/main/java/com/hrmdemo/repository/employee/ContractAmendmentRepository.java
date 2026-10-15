package com.hrmdemo.repository.employee;

import com.hrmdemo.entity.employee.ContractAmendment;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContractAmendmentRepository extends JpaRepository<ContractAmendment, UUID> {
    List<ContractAmendment> findByContractIdOrderByEffectiveOn(UUID contractId);
    boolean existsByContractId(UUID contractId);
    boolean existsByAmendmentNumber(String amendmentNumber);
}
