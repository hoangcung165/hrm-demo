package com.hrmdemo.service.employee;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.employee.EmployeeJobRequest;
import com.hrmdemo.dto.employee.WorkDecisionRequest;
import com.hrmdemo.dto.employee.WorkHistoryItem;
import com.hrmdemo.entity.audit.AuditAction;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.WorkDecision;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.repository.employee.WorkDecisionRepository;
import com.hrmdemo.repository.employee.ProbationEvaluationRepository;
import com.hrmdemo.repository.employee.ResignationRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.audit.AuditRecorder;
import com.hrmdemo.service.audit.AuditRegistrations;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Personnel decisions are documents; a job change and its history milestone commit together. */
@Service
@RequiredArgsConstructor
public class WorkHistoryService {
    private final EmployeeRepository employees;
    private final WorkDecisionRepository decisions;
    private final ProbationEvaluationRepository evaluations;
    private final ResignationRepository resignations;
    private final EmployeeService employeeService;
    private final SalaryProfileService salaryProfiles;
    private final AccessScopeService scopes;
    private final AuditRecorder audit;
    private final Clock clock;

    @Transactional(readOnly = true)
    public List<WorkHistoryItem> list(CurrentAccount caller, UUID employeeId) {
        AccessScope scope = scopes.scopeOf(caller);
        scope.require(Permission.EMPLOYEE_VIEW);
        Employee employee = employees.findById(employeeId).orElseThrow(WorkHistoryService::notFound);
        scope.requireEmployee(employeeId, employee.getOrgUnitId());
        List<WorkHistoryItem> timeline = new ArrayList<>();
        timeline.add(WorkHistoryItem.hire(employee));
        decisions.findByEmployeeIdOrderByEffectiveOnDescCreatedAtDesc(employeeId).stream()
                .map(WorkHistoryItem::decision).forEach(timeline::add);
        evaluations.findByEmployeeIdOrderByEndsOnDescCreatedAtDesc(employeeId).stream()
                .map(WorkHistoryItem::probation).forEach(timeline::add);
        resignations.findByEmployeeId(employeeId).map(WorkHistoryItem::resignation).ifPresent(timeline::add);
        timeline.sort(Comparator.comparing(WorkHistoryItem::effectiveOn).reversed());
        return timeline;
    }

    @Transactional
    public WorkHistoryItem create(CurrentAccount caller, UUID employeeId, WorkDecisionRequest request) {
        AccessScope scope = scopes.scopeOf(caller);
        scope.require(Permission.EMPLOYEE_EDIT);
        Employee employee = employees.lockForRecordEdit(employeeId).orElseThrow(WorkHistoryService::notFound);
        scope.requireEmployee(employeeId, employee.getOrgUnitId());
        if (!employee.isActive()) throw invalid("An inactive Employee cannot receive a work decision");
        if (request == null || blank(request.decisionNumber()) || request.decisionNumber().trim().length() > 80
                || blank(request.description()) || request.description().trim().length() > 1000
                || request.signedOn() == null || request.effectiveOn() == null) {
            throw invalid("Missing or invalid decision fields");
        }
        WorkDecision.Kind kind;
        try {
            kind = WorkDecision.Kind.valueOf(request.kind());
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw invalid("Invalid decision kind");
        }
        boolean changesPay = request.baseSalary() != null || request.insuranceSalary() != null
                || request.allowancesJson() != null;
        if (changesPay) scope.require(Permission.EMPLOYEE_SENSITIVE_VIEW);
        if (request.baseSalary() != null && request.baseSalary().signum() < 0
                || request.insuranceSalary() != null && request.insuranceSalary().signum() < 0
                || request.allowancesJson() != null && request.allowancesJson().isBlank()) {
            throw invalid("Invalid salary decision fields");
        }
        if (changesPay && kind == WorkDecision.Kind.DISCIPLINE) {
            throw invalid("A discipline decision cannot change salary");
        }
        LocalDate today = LocalDate.now(clock);
        if (request.signedOn().isAfter(request.effectiveOn()) || request.effectiveOn().isAfter(today)
                || request.effectiveOn().isBefore(employee.getHireDate())) {
            throw invalid("Decision must take effect between hire date and today, after it is signed");
        }
        List<WorkDecision> previous = decisions.findByEmployeeIdOrderByEffectiveOnDescCreatedAtDesc(employeeId);
        if (!previous.isEmpty() && request.effectiveOn().isBefore(previous.getFirst().getEffectiveOn())) {
            throw new ApiException(HttpStatus.CONFLICT, "work_history.backdated",
                    "A decision cannot precede an existing decision");
        }
        String number = request.decisionNumber().trim();
        if (decisions.existsByDecisionNumber(number)) {
            throw new ApiException(HttpStatus.CONFLICT, "work_history.number_taken", "Decision number already exists");
        }

        UUID oldUnit = employee.getOrgUnitId();
        UUID oldPosition = employee.getPositionId();
        UUID unit = oldUnit;
        UUID position = oldPosition;
        switch (kind) {
            case TRANSFER -> {
                if (request.positionId() != null || Objects.equals(request.orgUnitId(), oldUnit)) {
                    throw invalid("A transfer must change only the organization unit");
                }
                unit = request.orgUnitId();
            }
            case PROMOTION -> {
                if (request.orgUnitId() != null || request.positionId() == null
                        || request.positionId().equals(oldPosition)) {
                    throw invalid("A promotion must change only the position");
                }
                position = request.positionId();
            }
            case REWARD, DISCIPLINE -> {
                if (request.orgUnitId() != null || request.positionId() != null) {
                    throw invalid("This decision does not change the current job");
                }
            }
        }
        if (kind == WorkDecision.Kind.TRANSFER || kind == WorkDecision.Kind.PROMOTION) {
            // Reuse the existing validation of references, target data scope and manager cycles.
            employeeService.editJob(caller, employeeId, new EmployeeJobRequest(unit, position,
                    employee.getManagerId(),
                    employee.getHireDate(), employee.getStatus().name()));
        }
        WorkDecision saved = decisions.saveAndFlush(new WorkDecision(employeeId, number, kind, request.signedOn(),
                request.effectiveOn(), request.description().trim(), oldUnit, unit, oldPosition, position,
                caller.id(), clock.instant()));
        if (changesPay) {
            salaryProfiles.fromDecision(caller, saved, request.baseSalary(), request.insuranceSalary(),
                    request.allowancesJson());
        }
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("sourceId", saved.getId());
        fields.put("kind", kind.name());
        fields.put("decisionNumber", number);
        fields.put("effectiveOn", request.effectiveOn().toString());
        fields.put("previousOrgUnitId", oldUnit);
        fields.put("orgUnitId", unit);
        fields.put("previousPositionId", oldPosition);
        fields.put("positionId", position);
        audit.record(caller, AuditRegistrations.WORK_HISTORY, employeeId, AuditAction.CREATE,
                "Work decision recorded", null, fields);
        return WorkHistoryItem.decision(saved);
    }

    private static boolean blank(String value) { return value == null || value.isBlank(); }
    private static ApiException invalid(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "work_history.invalid", message);
    }
    private static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "employee.not_found", "Employee not found");
    }
}
