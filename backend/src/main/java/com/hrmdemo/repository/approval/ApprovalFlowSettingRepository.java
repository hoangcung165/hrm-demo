package com.hrmdemo.repository.approval;

import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.entity.approval.ApprovalFlowSetting;
import org.springframework.data.jpa.repository.JpaRepository;

/** The company's own approval flows; queries are filtered by Legal entity (ADR 0003). */
public interface ApprovalFlowSettingRepository extends JpaRepository<ApprovalFlowSetting, UUID> {

    Optional<ApprovalFlowSetting> findByRequestType(String requestType);
}
