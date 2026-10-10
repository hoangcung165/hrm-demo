package com.hrmdemo.service.approval;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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
    private final ApprovalDelegationService delegations;
    private final Clock clock;

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
        Map<UUID, Set<ApprovalRequestType>> delegators = delegations.delegatorsOf(me, today());
        Map<UUID, UUID> onBehalfOf = new HashMap<>();
        Page<ApprovalRequest> found = switch (box) {
            case WAITING -> delegators.isEmpty()
                    ? requests.findWaiting(me, Set.of(me), typeName, pattern, pageable)
                    : waitingWithDelegations(me, delegators, typeName, pattern, pageable, onBehalfOf);
            case SENT -> requests.findSent(me, typeName, pageable);
            case HANDLED -> requests.findHandled(me, ApprovalRequestViews.DECISIONS, typeName, pattern, pageable);
        };
        List<UUID> ids = found.getContent().stream().map(ApprovalRequest::getId).toList();
        Set<UUID> resubmitted = ids.isEmpty() ? Set.of()
                : logs.findByRequestIdInAndEventIn(ids, Set.of(Type.RESUBMITTED.name())).stream()
                        .map(entry -> entry.getRequestId()).collect(Collectors.toSet());
        return new PageResponse<>(views.rows(found.getContent(), onBehalfOf, resubmitted), found.getTotalElements());
    }

    @Transactional(readOnly = true)
    public ApprovalInboxCounts counts(CurrentAccount caller) {
        UUID me = caller.employeeId();
        if (me == null) {
            return new ApprovalInboxCounts(0, 0);
        }
        Map<UUID, Set<ApprovalRequestType>> delegators = delegations.delegatorsOf(me, today());
        long waiting = delegators.isEmpty() ? requests.countWaiting(me, Set.of(me))
                : waitingWithDelegations(me, delegators, null, null, Pageable.unpaged(), new HashMap<>())
                        .getTotalElements();
        return new ApprovalInboxCounts(waiting, requests.countSent(me,
                Set.of(ApprovalStatus.PENDING.name(), ApprovalStatus.RETURNED_FOR_INFO.name())));
    }

    /**
     * Waiting for the caller or for someone who delegated the request's type to the caller, when the request's flow
     * allows delegation. Delegations are few, so the candidates are filtered and paged in memory.
     *
     * @param onBehalfOf filled with the delegator for the rows the caller would approve in someone's place
     */
    private Page<ApprovalRequest> waitingWithDelegations(UUID me, Map<UUID, Set<ApprovalRequestType>> delegators,
            String typeName, String pattern, Pageable pageable, Map<UUID, UUID> onBehalfOf) {
        Set<UUID> approvers = new HashSet<>(delegators.keySet());
        approvers.add(me);
        List<ApprovalRequest> mine = new ArrayList<>();
        for (ApprovalRequest request : requests.findWaiting(me, approvers, typeName, pattern, Pageable.unpaged())) {
            if (request.getApprovers().contains(me)) {
                mine.add(request);
                continue;
            }
            if (!request.isDelegationAllowed()) {
                continue;
            }
            ApprovalRequestType type = ApprovalRequestType.valueOf(request.getRequestType());
            request.getApprovers().stream().sorted()
                    .filter(approver -> delegators.getOrDefault(approver, Set.of()).contains(type))
                    .findFirst()
                    .ifPresent(approver -> {
                        mine.add(request);
                        onBehalfOf.put(request.getId(), approver);
                    });
        }
        if (pageable.isUnpaged()) {
            return new PageImpl<>(mine);
        }
        int from = (int) Math.min(pageable.getOffset(), mine.size());
        int to = Math.min(from + pageable.getPageSize(), mine.size());
        return new PageImpl<>(mine.subList(from, to), pageable, mine.size());
    }

    private LocalDate today() {
        return LocalDate.ofInstant(clock.instant(), ApprovalRequestService.COMPANY_ZONE);
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
