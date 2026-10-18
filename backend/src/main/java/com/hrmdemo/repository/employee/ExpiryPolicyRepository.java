package com.hrmdemo.repository.employee;

import com.hrmdemo.entity.employee.ExpiryPolicy;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpiryPolicyRepository extends JpaRepository<ExpiryPolicy, UUID> {}
