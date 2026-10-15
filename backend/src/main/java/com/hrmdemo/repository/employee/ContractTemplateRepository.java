package com.hrmdemo.repository.employee;

import com.hrmdemo.entity.employee.ContractTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ContractTemplateRepository extends JpaRepository<ContractTemplate,UUID> {
    Optional<ContractTemplate> findFirstByContractTypeAndActiveTrue(String contractType);
    List<ContractTemplate> findByContractTypeOrderByVersionDesc(String contractType);
}
