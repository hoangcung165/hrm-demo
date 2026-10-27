package com.hrmdemo.service.leave;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import com.hrmdemo.dto.approval.ApprovalWarning;
import com.hrmdemo.dto.employee.EmployeeWorkFacts;
import com.hrmdemo.dto.leave.LeaveAttachmentSummary;
import com.hrmdemo.dto.leave.LeaveBalance;
import com.hrmdemo.dto.leave.LeaveRequestStatus;
import com.hrmdemo.entity.leave.LeaveRequest;
import com.hrmdemo.repository.leave.LeaveAttachmentRepository;
import com.hrmdemo.repository.leave.LeaveRequestRepository;
import com.hrmdemo.service.employee.EmployeeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * What an approver should look at in a waiting Đơn nghỉ before approving it: leave in advance, leave beyond the Số dư
 * phép, files to check. The Yêu cầu phê duyệt of a Đơn nghỉ has the id of the request, so the approval list asks by id.
 * A request that is not a waiting leave request has no warnings.
 */
@Component
@RequiredArgsConstructor
public class LeaveApprovalWarnings {

    private final LeaveRequestRepository requests;
    private final LeaveAttachmentRepository attachments;
    private final LeaveBalanceService balances;
    private final EmployeeService employees;

    /** The warnings of each waiting Đơn nghỉ among the ids; a request with none is absent from the map. */
    @Transactional(readOnly = true)
    public Map<UUID, List<ApprovalWarning>> of(Collection<UUID> requestIds) {
        List<LeaveRequest> waiting = requests.findAllById(requestIds).stream()
                .filter(request -> request.getStatus() == LeaveRequestStatus.PENDING).toList();
        Map<UUID, EmployeeWorkFacts> facts = employees
                .workFacts(waiting.stream().map(LeaveRequest::getEmployeeId).collect(Collectors.toSet()));
        Map<UUID, List<ApprovalWarning>> warnings = new HashMap<>();
        for (LeaveRequest request : waiting) {
            List<ApprovalWarning> found = new ArrayList<>();
            EmployeeWorkFacts sender = facts.get(request.getEmployeeId());
            if (sender != null) {
                balanceWarning(request, sender).ifPresent(found::add);
            }
            List<LeaveAttachmentSummary> files = attachments.summaries(request.getId());
            if (!files.isEmpty()) {
                found.add(new ApprovalWarning("leave.attachment", Map.of("count", files.size())));
            }
            if (!found.isEmpty()) {
                warnings.put(request.getId(), found);
            }
        }
        return warnings;
    }

    /**
     * The request already counts as Đang chờ in the balance, so a negative Còn lại means it goes beyond what has
     * accrued (an advance), and a negative available amount means beyond what even an advance allows.
     */
    private Optional<ApprovalWarning> balanceWarning(LeaveRequest request, EmployeeWorkFacts sender) {
        LeaveBalance balance = balances.balance(request.getEmployeeId(), sender.hireDate(), request.getLeaveTypeId(),
                request.getStartDate().getYear());
        if (!balance.limited() || balance.remaining() == null) {
            return Optional.empty();
        }
        if (balance.available() != null && balance.available().signum() < 0) {
            return Optional.of(new ApprovalWarning("leave.over_balance",
                    Map.of("remaining", number(balance.remaining()), "available", number(balance.available()))));
        }
        return balance.remaining().signum() < 0
                ? Optional.of(new ApprovalWarning("leave.advance", Map.of("remaining",
                        number(balance.remaining()))))
                : Optional.empty();
    }

    private static Object number(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }
}
