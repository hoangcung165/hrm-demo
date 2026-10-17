package com.hrmdemo.service.audit;

import static com.hrmdemo.service.audit.AuditedType.field;
import static com.hrmdemo.service.audit.AuditedType.masked;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Which records are audited. To audit a new kind of record, add a bean here and call
 * {@link AuditRecorder#record} where the record changes; the steps, including the screen labels, are in
 * {@code docs/agents/audit-log.md}. Salary profiles are audited by HRM-10 (ADR 0004: every change of a Hồ sơ lương
 * is audited); work-history decisions are audited by HRM-11.
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

    /** The Employee's effective-dated salary history; entity id is the Employee id. */
    public static final String SALARY_PROFILE = "SALARY_PROFILE";

    /** Signed personnel decisions for an Employee; entity id is the Employee id. */
    public static final String WORK_HISTORY = "WORK_HISTORY";

    /** Immutable probation outcomes; entity id is the Employee id. */
    public static final String PROBATION_EVALUATION = "PROBATION_EVALUATION";

    /** One immutable departure document per Employee. */
    public static final String RESIGNATION = "RESIGNATION";

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

    @Bean
    AuditedType salaryProfileAudit() {
        return new AuditedType(SALARY_PROFILE, "Salary profile",
                List.of(field("employeeId"), field("sourceContractId"), field("sourceAmendmentId"),
                        field("sourceDecisionId"),
                        field("effectiveOn"), field("endsOn"), masked("baseSalary"),
                        masked("insuranceSalary"), masked("allowancesJson"), field("insured"),
                        field("taxMethod"), masked("overrideReason")));
    }

    @Bean
    AuditedType workHistoryAudit() {
        return new AuditedType(WORK_HISTORY, "Work history",
                List.of(field("sourceId"), field("kind"), field("decisionNumber"), field("effectiveOn"),
                        field("previousOrgUnitId"), field("orgUnitId"), field("previousPositionId"),
                        field("positionId")));
    }

    @Bean
    AuditedType probationEvaluationAudit() {
        return new AuditedType(PROBATION_EVALUATION, "Probation evaluation",
                List.of(field("sourceId"), field("sourceContractId"), field("evaluatorId"),
                        field("startsOn"), field("endsOn"), field("outcome")));
    }

    @Bean
    AuditedType resignationAudit() {
        return new AuditedType(RESIGNATION, "Resignation",
                List.of(field("sourceId"), field("lastWorkingDay"), field("reason"), field("actorId")));
    }
}
