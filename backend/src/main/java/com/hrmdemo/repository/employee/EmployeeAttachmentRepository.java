package com.hrmdemo.repository.employee;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.dto.employee.EmployeeAttachmentSummary;
import com.hrmdemo.entity.employee.EmployeeAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmployeeAttachmentRepository extends JpaRepository<EmployeeAttachment, UUID> {
    /** Select only metadata; loading list entries must not load their binary content. */
    @Query("""
            select new com.hrmdemo.dto.employee.EmployeeAttachmentSummary(
                a.id, a.fileName, a.contentType, a.contentLength, a.sha256, a.uploadedAt)
            from EmployeeAttachment a where a.employeeId = :employeeId order by a.uploadedAt desc, a.id
            """)
    List<EmployeeAttachmentSummary> summaries(@Param("employeeId") UUID employeeId);

    Optional<EmployeeAttachment> findByIdAndEmployeeId(UUID id, UUID employeeId);
}
