package com.hrmdemo.repository.leave;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.dto.leave.LeaveAttachmentSummary;
import com.hrmdemo.entity.leave.LeaveAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Files of Đơn nghỉ; queries are filtered by Legal entity (ADR 0003). */
public interface LeaveAttachmentRepository extends JpaRepository<LeaveAttachment, UUID> {

    /** Only metadata: a list never loads the content. */
    @Query("""
            select new com.hrmdemo.dto.leave.LeaveAttachmentSummary(a.id, a.fileName, a.contentType, a.sizeBytes,
                a.createdAt)
            from LeaveAttachment a where a.leaveRequestId = :requestId order by a.createdAt, a.id""")
    List<LeaveAttachmentSummary> summaries(@Param("requestId") UUID requestId);

    /** Uploads of the Employee among the ids (metadata and content). */
    List<LeaveAttachment> findByEmployeeIdAndIdIn(UUID employeeId, Collection<UUID> ids);

    List<LeaveAttachment> findByLeaveRequestId(UUID requestId);
}
