package com.hrmdemo.service.approval;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import com.hrmdemo.dto.approval.ApprovalDelegationRequest;
import com.hrmdemo.dto.approval.ApprovalDelegationResponse;
import com.hrmdemo.dto.approval.ApprovalDelegationStatus;
import com.hrmdemo.dto.approval.ApprovalDelegationsResponse;
import com.hrmdemo.dto.approval.ApprovalRequestType;
import com.hrmdemo.dto.employee.EmployeeCard;
import com.hrmdemo.entity.approval.ApprovalDelegation;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.approval.ApprovalDelegationRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.employee.EmployeeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ủy quyền duyệt: an approver hands their approvals of some request types to another Employee for a range of days.
 * The approval engine reads them live through {@link ApprovalDelegations}, so a delegation also covers requests that
 * were already waiting. The delegator keeps acting too; whoever acts first moves the request on. Whether a request's
 * flow allows delegation is the engine's check, not this one's.
 */
@Service
@RequiredArgsConstructor
public class ApprovalDelegationService implements ApprovalDelegations {

    private final ApprovalDelegationRepository delegations;
    private final EmployeeService employees;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public Set<UUID> delegatesOf(UUID approverEmployeeId, ApprovalRequestType type, LocalDate date) {
        return delegations.findByDelegatorIdAndEndDateGreaterThanEqualAndEndedAtIsNull(approverEmployeeId, date)
                .stream()
                .filter(d -> d.coversDate(date) && d.getRequestTypes().contains(type.name()))
                .map(ApprovalDelegation::getDelegateId)
                .collect(Collectors.toSet());
    }

    /** The approvers who delegated to the Employee on that date, with the types each one covers. */
    @Transactional(readOnly = true)
    public Map<UUID, Set<ApprovalRequestType>> delegatorsOf(UUID delegateEmployeeId, LocalDate date) {
        Map<UUID, Set<ApprovalRequestType>> byDelegator = new HashMap<>();
        for (ApprovalDelegation d : delegations.findByDelegateIdAndEndDateGreaterThanEqualAndEndedAtIsNull(
                delegateEmployeeId, date)) {
            if (d.coversDate(date)) {
                byDelegator.computeIfAbsent(d.getDelegatorId(), id -> EnumSet.noneOf(ApprovalRequestType.class))
                        .addAll(types(d));
            }
        }
        return byDelegator;
    }

    @Transactional(readOnly = true)
    public ApprovalDelegationsResponse list(CurrentAccount caller) {
        UUID me = ApprovalRequestService.requireEmployee(caller);
        List<ApprovalDelegation> given = delegations.findByDelegatorIdOrderByStartDateDesc(me);
        List<ApprovalDelegation> received = delegations.findByDelegateIdOrderByStartDateDesc(me);
        Map<UUID, EmployeeCard> cards = cards(Stream.concat(given.stream(), received.stream()).toList());
        LocalDate today = today();
        return new ApprovalDelegationsResponse(responses(given, cards, today), responses(received, cards, today));
    }

    @Transactional
    public ApprovalDelegationResponse create(CurrentAccount caller, ApprovalDelegationRequest request) {
        UUID me = ApprovalRequestService.requireEmployee(caller);
        LocalDate today = today();
        if (request.endDate().isBefore(request.startDate())) {
            throw invalid("approval_delegation.end_before_start", "The last day is before the first day");
        }
        if (request.startDate().isBefore(today)) {
            throw invalid("approval_delegation.start_in_past", "A delegation starts today or later");
        }
        if (request.delegateId().equals(me)) {
            throw invalid("approval_delegation.self", "Delegate to someone else");
        }
        if (request.requestTypes().contains(ApprovalRequestType.PAYROLL)) {
            throw invalid("approval_delegation.payroll", "Payroll approvals cannot be delegated");
        }
        if (employees.activeIds(Set.of(request.delegateId())).isEmpty()) {
            throw invalid("approval_delegation.delegate_not_found", "The delegate is not an active Employee");
        }
        Set<String> types = request.requestTypes().stream().map(Enum::name).collect(Collectors.toSet());
        boolean overlaps = delegations.findByDelegatorIdAndEndDateGreaterThanEqualAndEndedAtIsNull(me, today)
                .stream()
                .anyMatch(d -> !d.getEndDate().isBefore(request.startDate())
                        && !d.getStartDate().isAfter(request.endDate())
                        && d.getRequestTypes().stream().anyMatch(types::contains));
        if (overlaps) {
            throw new ApiException(HttpStatus.CONFLICT, "approval_delegation.overlap",
                    "Another delegation already covers some of these days and types");
        }
        ApprovalDelegation saved = delegations.save(new ApprovalDelegation(me, request.delegateId(),
                request.startDate(), request.endDate(), types, clock.instant()));
        return response(saved, cards(List.of(saved)), today);
    }

    /** Kết thúc sớm: an active delegation stops now. */
    @Transactional
    public ApprovalDelegationResponse endEarly(CurrentAccount caller, UUID id) {
        ApprovalDelegation delegation = own(caller, id);
        if (status(delegation, today()) != ApprovalDelegationStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "approval_delegation.not_active",
                    "Only a delegation in force can be ended early");
        }
        delegation.endEarly(clock.instant());
        return response(delegation, cards(List.of(delegation)), today());
    }

    /** Hủy ủy quyền: one that has not started is removed. */
    @Transactional
    public void cancel(CurrentAccount caller, UUID id) {
        ApprovalDelegation delegation = own(caller, id);
        if (status(delegation, today()) != ApprovalDelegationStatus.UPCOMING) {
            throw new ApiException(HttpStatus.CONFLICT, "approval_delegation.not_upcoming",
                    "Only a delegation that has not started can be cancelled; end it early instead");
        }
        delegations.delete(delegation);
    }

    private ApprovalDelegation own(CurrentAccount caller, UUID id) {
        UUID me = ApprovalRequestService.requireEmployee(caller);
        return delegations.findById(id).filter(d -> d.getDelegatorId().equals(me))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "approval_delegation.not_found",
                        "No such delegation of yours"));
    }

    private List<ApprovalDelegationResponse> responses(List<ApprovalDelegation> list, Map<UUID, EmployeeCard> cards,
            LocalDate today) {
        return list.stream()
                .sorted(Comparator.comparing((ApprovalDelegation d) -> status(d, today) == ApprovalDelegationStatus.ENDED)
                        .thenComparing(ApprovalDelegation::getStartDate, Comparator.reverseOrder()))
                .map(d -> response(d, cards, today))
                .toList();
    }

    private static ApprovalDelegationResponse response(ApprovalDelegation d, Map<UUID, EmployeeCard> cards,
            LocalDate today) {
        return new ApprovalDelegationResponse(d.getId(), cards.get(d.getDelegatorId()), cards.get(d.getDelegateId()),
                d.getStartDate(), d.getEndDate(), types(d).stream().sorted().toList(), status(d, today),
                d.getEndedAt());
    }

    static ApprovalDelegationStatus status(ApprovalDelegation d, LocalDate today) {
        if (d.getEndedAt() != null || d.getEndDate().isBefore(today)) {
            return ApprovalDelegationStatus.ENDED;
        }
        return d.getStartDate().isAfter(today) ? ApprovalDelegationStatus.UPCOMING : ApprovalDelegationStatus.ACTIVE;
    }

    private static Set<ApprovalRequestType> types(ApprovalDelegation d) {
        Set<ApprovalRequestType> types = EnumSet.noneOf(ApprovalRequestType.class);
        Arrays.stream(ApprovalRequestType.values()).filter(t -> d.getRequestTypes().contains(t.name()))
                .forEach(types::add);
        return types;
    }

    private Map<UUID, EmployeeCard> cards(List<ApprovalDelegation> list) {
        Set<UUID> ids = new HashSet<>();
        list.forEach(d -> {
            ids.add(d.getDelegatorId());
            ids.add(d.getDelegateId());
        });
        return employees.cards(ids);
    }

    private LocalDate today() {
        return LocalDate.ofInstant(clock.instant(), ApprovalRequestService.COMPANY_ZONE);
    }

    private static ApiException invalid(String code, String detail) {
        return new ApiException(HttpStatus.BAD_REQUEST, code, detail);
    }
}
