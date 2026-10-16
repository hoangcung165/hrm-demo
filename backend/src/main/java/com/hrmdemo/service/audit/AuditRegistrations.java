package com.hrmdemo.service.audit;

import static com.hrmdemo.service.audit.AuditedType.field;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Which records are audited. To audit a new kind of record, add a bean here and call
 * {@link AuditRecorder#record} where the record changes; the steps, including the screen labels, are in
 * {@code docs/agents/audit-log.md}. Salary profiles and contracts follow with HRM-10 (ADR 0004: every change of a Hồ sơ
 * lương is audited), the work history with HRM-11.
 */
@Configuration(proxyBeanMethods = false)
public class AuditRegistrations {

    /** Ngưỡng nguồn lực: one record per Pháp nhân, so its id is the Legal entity id. */
    public static final String RESOURCE_SETTING = "RESOURCE_SETTING";

    /** Lịch làm việc: one record per Pháp nhân, so its id is the Legal entity id. */
    public static final String WORK_SCHEDULE = "WORK_SCHEDULE";

    /** Loại nghỉ: its name, place in the lists and whether it takes new requests. */
    public static final String LEAVE_TYPE = "LEAVE_TYPE";

    /** Chính sách phép: one record per saved version; its id is the Loại nghỉ id. */
    public static final String LEAVE_POLICY = "LEAVE_POLICY";

    @Bean
    AuditedType resourceSettingAudit() {
        return new AuditedType(RESOURCE_SETTING, "Resource thresholds",
                List.of(field("benchPercent"), field("nearFullPercent"), field("endingWeeks")));
    }

    @Bean
    AuditedType workScheduleAudit() {
        return new AuditedType(WORK_SCHEDULE, "Work schedule", List.of(field("monday"), field("tuesday"),
                field("wednesday"), field("thursday"), field("friday"), field("saturday"), field("sunday")));
    }

    @Bean
    AuditedType leaveTypeAudit() {
        return new AuditedType(LEAVE_TYPE, "Leave type",
                List.of(field("code"), field("name"), field("sortOrder"), field("active")));
    }

    @Bean
    AuditedType leavePolicyAudit() {
        return new AuditedType(LEAVE_POLICY, "Leave policy", List.of(field("effectiveFrom"), field("pay"),
                field("halfDayAllowed"), field("attachmentRequired"), field("limited"), field("entitlementDays"),
                field("seniorityStepYears"), field("accrual"), field("cutOffDay"), field("advanceAllowed"),
                field("maxDaysPerRequest"), field("carryOverMaxDays"), field("carryOverExpiry")));
    }
}
