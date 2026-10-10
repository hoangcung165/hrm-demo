package com.hrmdemo.service.approval;

import java.util.UUID;

import com.hrmdemo.exception.ApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Tự duyệt in the background: every few minutes, each waiting level whose delay has passed approves itself through
 * the engine, as the system, with the same events (and so the same notifications) as an approver's decision.
 * <p>
 * Safe with several app instances: each request is approved in its own transaction and the request's version lets
 * only one instance through. Payroll flows have no delay, and returned requests are not waiting, so neither is ever
 * picked. Runs only while {@code hrm.scheduling.enabled} is on (see {@code SchedulingConfig}).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ApprovalAutoApproveJob {

    private final ApprovalRequestService requests;

    /** @return how many levels approved themselves in this run */
    @Scheduled(initialDelayString = "${hrm.approval.auto-approve.initial-delay:PT1M}",
            fixedDelayString = "${hrm.approval.auto-approve.interval:PT5M}")
    public int run() {
        int approved = 0;
        for (UUID id : requests.dueForAutoApprove()) {
            try {
                if (requests.autoApproveIfDue(id)) {
                    approved++;
                }
            } catch (ApiException e) {
                // Another instance, or an approver, acted on it at the same moment: it is handled.
                log.debug("Auto-approve of {} skipped: {}", id, e.getMessage());
            } catch (RuntimeException e) {
                // One broken request must not stop the others; the next run tries it again.
                log.warn("Auto-approve of {} failed", id, e);
            }
        }
        if (approved > 0) {
            log.info("Auto-approved {} approval request level(s)", approved);
        }
        return approved;
    }
}
