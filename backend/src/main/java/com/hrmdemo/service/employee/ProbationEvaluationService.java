package com.hrmdemo.service.employee;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.employee.ProbationEvaluationRequest;
import com.hrmdemo.dto.employee.ProbationEvaluationResponse;
import com.hrmdemo.entity.audit.AuditAction;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.EmploymentContract;
import com.hrmdemo.entity.employee.EmployeeSalaryProfile;
import com.hrmdemo.entity.employee.ProbationEvaluation;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.repository.employee.EmploymentContractRepository;
import com.hrmdemo.repository.employee.EmployeeSalaryProfileRepository;
import com.hrmdemo.repository.employee.ProbationEvaluationRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.audit.AuditRecorder;
import com.hrmdemo.service.audit.AuditRegistrations;
import java.time.Clock;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProbationEvaluationService {
    private final EmployeeRepository employees;
    private final EmploymentContractRepository contracts;
    private final EmployeeSalaryProfileRepository salaryProfiles;
    private final ProbationEvaluationRepository evaluations;
    private final AccessScopeService scopes;
    private final AuditRecorder audit;
    private final Clock clock;

    @Transactional(readOnly = true)
    public List<ProbationEvaluationResponse> list(CurrentAccount caller, UUID employeeId) {
        authorized(caller, employeeId);
        return evaluations.findByEmployeeIdOrderByEndsOnDescCreatedAtDesc(employeeId).stream()
                .map(e -> {
                    EmploymentContract contract = contracts.findById(e.getSourceContractId())
                            .orElseThrow(ProbationEvaluationService::contractNotFound);
                    return response(e, contract);
                }).toList();
    }

    @Transactional
    public ProbationEvaluationResponse create(CurrentAccount caller, UUID employeeId,
            ProbationEvaluationRequest request) {
        AccessScope scope = scopes.scopeOf(caller);
        scope.require(Permission.EMPLOYEE_EDIT);
        scope.require(Permission.EMPLOYEE_SENSITIVE_VIEW);
        Employee employee = employees.lockForRecordEdit(employeeId).orElseThrow(ProbationEvaluationService::notFound);
        scope.requireEmployee(employeeId, employee.getOrgUnitId());
        if (!employee.isActive()) throw invalid("An inactive Employee cannot be evaluated");
        if (request == null || request.sourceContractId() == null || request.evaluatorId() == null
                || request.startsOn() == null || request.endsOn() == null || request.outcome() == null
                || request.notes() == null || request.notes().isBlank() || request.notes().trim().length() > 1000) {
            throw invalid("Missing probation evaluation fields");
        }
        ProbationEvaluation.Outcome outcome;
        try {
            outcome = ProbationEvaluation.Outcome.valueOf(request.outcome());
        } catch (IllegalArgumentException ex) {
            throw invalid("Invalid probation outcome");
        }
        EmploymentContract contract = contracts.findById(request.sourceContractId())
                .orElseThrow(ProbationEvaluationService::contractNotFound);
        if (!contract.getEmployeeId().equals(employeeId)
                || !"PROBATION".equalsIgnoreCase(contract.getContractType())) {
            throw contractNotFound();
        }
        Employee evaluator = employees.findById(request.evaluatorId()).orElseThrow(() ->
                invalid("Evaluator does not exist"));
        if (!evaluator.isActive()) throw invalid("Evaluator must be active");
        if (contract.getEndsOn() == null || request.startsOn().isBefore(contract.getStartsOn())
                || request.endsOn().isAfter(contract.getEndsOn())
                || request.endsOn().isBefore(request.startsOn())
                || request.endsOn().isAfter(LocalDate.now(clock))) {
            throw invalid("Evaluation must be within the completed probation contract period");
        }
        List<ProbationEvaluation> previous = evaluations
                .findBySourceContractIdOrderByEndsOnDescCreatedAtDesc(contract.getId());
        if (!previous.isEmpty()) {
            ProbationEvaluation last = previous.getFirst();
            if (last.getOutcome() != ProbationEvaluation.Outcome.EXTEND
                    || !request.startsOn().isAfter(last.getEndsOn())) {
                throw new ApiException(HttpStatus.CONFLICT, "probation.already_evaluated",
                        "Only an extended probation may receive a later evaluation");
            }
        }
        ProbationEvaluation saved = evaluations.save(new ProbationEvaluation(employeeId, contract.getId(),
                evaluator.getId(), request.startsOn(), request.endsOn(), outcome,
                request.notes().trim(), caller.id(), clock.instant()));
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("sourceId", saved.getId());
        fields.put("sourceContractId", contract.getId());
        fields.put("evaluatorId", evaluator.getId());
        fields.put("startsOn", request.startsOn().toString());
        fields.put("endsOn", request.endsOn().toString());
        fields.put("outcome", outcome.name());
        audit.record(caller, AuditRegistrations.PROBATION_EVALUATION, employeeId, AuditAction.CREATE,
                "Probation evaluation recorded", null, fields);
        return response(saved, contract);
    }

    private ProbationEvaluationResponse response(ProbationEvaluation evaluation, EmploymentContract contract) {
        EmployeeSalaryProfile salary = null;
        if (evaluation.getOutcome() == ProbationEvaluation.Outcome.PASS) {
            salary = salaryProfiles.findByEmployeeIdOrderByEffectiveOnAsc(evaluation.getEmployeeId()).stream()
                    .filter(p -> p.getSourceContractId().equals(contract.getId())
                            && !p.getEffectiveOn().isAfter(evaluation.getEndsOn())
                            && (p.getEndsOn() == null || !p.getEndsOn().isBefore(evaluation.getEndsOn())))
                    .reduce((first, last) -> last).orElseThrow(() ->
                            new ApiException(HttpStatus.CONFLICT, "probation.no_salary_source",
                                    "No effective salary profile for probation evaluation"));
        }
        return ProbationEvaluationResponse.from(evaluation, contract, salary);
    }

    private void authorized(CurrentAccount caller, UUID employeeId) {
        AccessScope scope = scopes.scopeOf(caller);
        scope.require(Permission.EMPLOYEE_VIEW);
        scope.require(Permission.EMPLOYEE_SENSITIVE_VIEW); // A PASS pre-fills contract salary fields.
        Employee employee = employees.findById(employeeId).orElseThrow(ProbationEvaluationService::notFound);
        scope.requireEmployee(employeeId, employee.getOrgUnitId());
    }

    private static ApiException invalid(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "probation.invalid", message);
    }
    private static ApiException contractNotFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "contract.not_found", "Probation contract not found");
    }
    private static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "employee.not_found", "Employee not found");
    }
}
