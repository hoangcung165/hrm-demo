package com.hrmdemo.service.approval;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import com.hrmdemo.dto.PageResponse;
import com.hrmdemo.dto.approval.ApprovalBox;
import com.hrmdemo.dto.approval.ApprovalInboxCounts;
import com.hrmdemo.dto.approval.ApprovalInboxItem;
import com.hrmdemo.dto.approval.ApprovalRequestType;
import com.hrmdemo.dto.approval.ApprovalStatus;
import com.hrmdemo.entity.SearchText;
import com.hrmdemo.entity.approval.ApprovalRequest;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.approval.ApprovalRequestLogRepository;
import com.hrmdemo.repository.approval.ApprovalRequestRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.approval.ApprovalEvent.Type;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Hộp thư duyệt: the three tabs and their counts. Every signed-in Account linked to an Employee has one; an Account
 * without an Employee gets empty lists.
 */
@Service
@RequiredArgsConstructor
public class ApprovalInboxService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_QUERY = 100;

    private final ApprovalRequestRepository requests;
    private final ApprovalRequestLogRepository logs;
    private final ApprovalRequestViews views;

    @Transactional(readOnly = true)
    public PageResponse<ApprovalInboxItem> list(CurrentAccount caller, ApprovalBox box, ApprovalRequestType type,
            String q, int page, int size) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "validation.invalid", "page from 0, size 1 to 100");
        }
        UUID me = caller.employeeId();
        if (me == null) {
            return new PageResponse<>(List.of(), 0);
        }
        String typeName = type == null ? null : type.name();
        String pattern = pattern(q);
        PageRequest pageable = PageRequest.of(page, size);
        Page<ApprovalRequest> found = switch (box) {
            case WAITING -> requests.findWaiting(me, Set.of(me), typeName, pattern, pageable);
            case SENT -> requests.findSent(me, typeName, pageable);
            case HANDLED -> requests.findHandled(me, ApprovalRequestViews.DECISIONS, typeName, pattern, pageable);
        };
        List<UUID> ids = found.getContent().stream().map(ApprovalRequest::getId).toList();
        Set<UUID> resubmitted = ids.isEmpty() ? Set.of()
                : logs.findByRequestIdInAndEventIn(ids, Set.of(Type.RESUBMITTED.name())).stream()
                        .map(entry -> entry.getRequestId()).collect(Collectors.toSet());
        // Ủy quyền duyệt comes with HRM-12/BE-4: until then the caller acts in their own name only.
        Map<UUID, UUID> onBehalfOf = new HashMap<>();
        return new PageResponse<>(views.rows(found.getContent(), onBehalfOf, resubmitted), found.getTotalElements());
    }

    @Transactional(readOnly = true)
    public ApprovalInboxCounts counts(CurrentAccount caller) {
        UUID me = caller.employeeId();
        if (me == null) {
            return new ApprovalInboxCounts(0, 0);
        }
        return new ApprovalInboxCounts(requests.countWaiting(me, Set.of(me)), requests.countSent(me,
                Set.of(ApprovalStatus.PENDING.name(), ApprovalStatus.RETURNED_FOR_INFO.name())));
    }

    private static String pattern(String q) {
        if (!StringUtils.hasText(q)) {
            return null;
        }
        if (q.length() > MAX_QUERY) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "validation.invalid", "q is at most 100 characters");
        }
        return SearchText.containsPattern(q);
    }
}
