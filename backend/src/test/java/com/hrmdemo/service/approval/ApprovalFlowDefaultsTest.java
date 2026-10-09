package com.hrmdemo.service.approval;

import static org.assertj.core.api.Assertions.assertThat;

import com.hrmdemo.dto.approval.ApprovalRequestType;
import com.hrmdemo.dto.approval.ApproverRule;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

/** Every request type has a default flow that follows the flow rules; payroll has nothing automatic. */
class ApprovalFlowDefaultsTest {

    @ParameterizedTest
    @EnumSource(ApprovalRequestType.class)
    void everyTypeHasAValidDefault(ApprovalRequestType type) {
        ApprovalFlow flow = ApprovalFlowDefaults.of(type);

        assertThat(flow.requestType()).isEqualTo(type);
        assertThat(flow.levelCount()).isBetween(1, ApprovalFlow.MAX_LEVELS);
        if (type == ApprovalRequestType.PAYROLL) {
            assertThat(flow.autoApproveDays()).isNull();
            assertThat(flow.delegationAllowed()).isFalse();
            assertThat(flow.levelCount()).isEqualTo(3);
        }
        if (type == ApprovalRequestType.TIMESHEET) {
            assertThat(flow.level(1).rule()).isEqualTo(ApproverRule.PROJECT_MANAGER);
        }
    }
}
