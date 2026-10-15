package com.hrmdemo.dto.employee;

import com.hrmdemo.entity.employee.ContractTemplate;
import java.time.Instant;
import java.util.UUID;

public record ContractTemplateSummary(UUID id,String contractType,int version,String fileName,
        boolean active,Instant uploadedAt) {
    public static ContractTemplateSummary from(ContractTemplate t) {
        return new ContractTemplateSummary(t.getId(),t.getContractType(),t.getVersion(),
                t.getFileName(),t.isActive(),t.getUploadedAt());
    }
}
