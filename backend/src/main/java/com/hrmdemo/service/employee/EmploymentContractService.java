package com.hrmdemo.service.employee;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.employee.ContractAmendmentRequest;
import com.hrmdemo.dto.employee.ContractAmendmentResponse;
import com.hrmdemo.dto.employee.EmploymentContractResponse;
import com.hrmdemo.dto.employee.EmploymentContractRequest;
import com.hrmdemo.entity.employee.ContractAmendment;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.EmploymentContract;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.employee.ContractAmendmentRepository;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.repository.employee.EmploymentContractRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import java.time.Clock;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EmploymentContractService {
    private final EmployeeRepository employees;
    private final EmploymentContractRepository contracts;
    private final ContractAmendmentRepository amendments;
    private final AccessScopeService scopes;
    private final Clock clock;
    private final SalaryProfileService salaryProfiles;

    private Employee authorized(CurrentAccount caller, UUID id, boolean edit) {
        AccessScope scope = scopes.scopeOf(caller);
        // Salary data is sensitive: require both profile permission and sensitive permission.
        scope.require(edit ? Permission.EMPLOYEE_EDIT : Permission.EMPLOYEE_VIEW);
        scope.require(Permission.EMPLOYEE_SENSITIVE_VIEW);
        Employee employee = employees.findById(id).orElseThrow(() -> error(HttpStatus.NOT_FOUND,
                "employee.not_found", "Employee not found"));
        scope.requireEmployee(id, employee.getOrgUnitId());
        return employee;
    }

    @Transactional(readOnly = true)
    public List<EmploymentContractResponse> list(CurrentAccount caller, UUID employeeId) {
        authorized(caller, employeeId, false);
        return contracts.findByEmployeeIdOrderByStartsOnDesc(employeeId).stream()
                .map(EmploymentContractResponse::from).toList();
    }

    @Transactional
    public EmploymentContractResponse create(CurrentAccount caller, UUID employeeId, EmploymentContractRequest request) {
        authorized(caller, employeeId, true);
        employees.lockForRecordEdit(employeeId).orElseThrow();
        validate(request);
        if (contracts.existsByContractNumber(request.contractNumber())) {
            throw error(HttpStatus.CONFLICT, "contract.number_taken", "Contract number already exists");
        }
        rejectOverlap(employeeId, null, request);
        boolean insured = insuranceFlag(request);
        String taxMethod = taxMethod(request);
        EmploymentContract saved = contracts.save(new EmploymentContract(employeeId, request.contractNumber().trim(),
                request.contractType().trim(), request.signedOn(), request.startsOn(), request.endsOn(),
                request.baseSalary(), request.insuranceSalary(), request.allowancesJson() == null
                        ? "[]" : request.allowancesJson(), insured, taxMethod,
                clock.instant()));
        salaryProfiles.fromContract(saved, request.overrideReason());
        return EmploymentContractResponse.from(saved);
    }

    @Transactional
    public EmploymentContractResponse update(CurrentAccount caller, UUID employeeId, UUID id,
            EmploymentContractRequest request) {
        authorized(caller, employeeId, true);
        employees.lockForRecordEdit(employeeId).orElseThrow();
        EmploymentContract current = findContract(employeeId, id);
        validate(request);
        if (!current.getContractNumber().equals(request.contractNumber())
                && contracts.existsByContractNumber(request.contractNumber())) {
            throw error(HttpStatus.CONFLICT, "contract.number_taken", "Contract number already exists");
        }
        rejectOverlap(employeeId, id, request);
        if (!current.getStartsOn().equals(request.startsOn())
                || !Objects.equals(current.getEndsOn(), request.endsOn())
                || current.getBaseSalary().compareTo(request.baseSalary()) != 0
                || !Objects.equals(current.getInsuranceSalary(), request.insuranceSalary())
                || !Objects.equals(current.getAllowancesJson(), request.allowancesJson() == null ? "[]" : request.allowancesJson())
                || current.isInsured() != insuranceFlag(request)
                || !current.getTaxMethod().equals(taxMethod(request))) {
            throw error(HttpStatus.CONFLICT, "contract.salary_change_requires_amendment",
                    "Effective salary and contract dates cannot be rewritten; create an amendment");
        }
        current.revise(request.contractNumber().trim(), request.contractType().trim(),
                request.signedOn(), request.startsOn(), request.endsOn(), request.baseSalary(),
                request.insuranceSalary(), request.allowancesJson() == null ? "[]" : request.allowancesJson(),
                insuranceFlag(request), taxMethod(request), clock.instant());
        return EmploymentContractResponse.from(current);
    }

    @Transactional
    public void delete(CurrentAccount caller, UUID employeeId, UUID id) {
        authorized(caller, employeeId, true);
        employees.lockForRecordEdit(employeeId).orElseThrow();
        EmploymentContract contract = findContract(employeeId, id);
        if (amendments.existsByContractId(id)) {
            throw error(HttpStatus.CONFLICT, "contract.has_amendments", "Cannot delete a contract with amendments");
        }
        throw error(HttpStatus.CONFLICT, "contract.salary_source_locked",
                "A contract used as a salary source cannot be deleted; use an amendment");
    }

    @Transactional(readOnly = true)
    public List<ContractAmendmentResponse> amendments(CurrentAccount caller, UUID employeeId, UUID id) {
        authorized(caller, employeeId, false);
        findContract(employeeId, id);
        return amendments.findByContractIdOrderByEffectiveOn(id).stream()
                .map(ContractAmendmentResponse::from).toList();
    }

    @Transactional
    public ContractAmendmentResponse addAmendment(CurrentAccount caller, UUID employeeId, UUID id,
            ContractAmendmentRequest request) {
        authorized(caller, employeeId, true);
        employees.lockForRecordEdit(employeeId).orElseThrow();
        EmploymentContract contract = findContract(employeeId, id);
        if (request == null || blank(request.amendmentNumber()) || request.signedOn() == null
                || request.effectiveOn() == null || blank(request.description())) {
            throw error(HttpStatus.BAD_REQUEST, "contract.invalid_amendment", "Missing amendment fields");
        }
        if (request.effectiveOn().isBefore(contract.getStartsOn())
                || (contract.getEndsOn() != null && request.effectiveOn().isAfter(contract.getEndsOn()))) {
            throw error(HttpStatus.BAD_REQUEST, "contract.amendment_outside_term",
                    "Amendment must take effect within contract term");
        }
        if (amendments.existsByAmendmentNumber(request.amendmentNumber())) {
            throw error(HttpStatus.CONFLICT, "contract.amendment_number_taken", "Amendment number already exists");
        }
        if (request.baseSalary() != null && request.baseSalary().signum() < 0
                || request.insuranceSalary() != null && request.insuranceSalary().signum() < 0) {
            throw error(HttpStatus.BAD_REQUEST, "contract.invalid_amendment", "Salary cannot be negative");
        }
        ContractAmendment saved = amendments.save(new ContractAmendment(id, request.amendmentNumber().trim(),
                request.signedOn(), request.effectiveOn(), request.description().trim(), clock.instant()));
        if (request.baseSalary() != null || request.insuranceSalary() != null
                || request.allowancesJson() != null || request.insured() != null || request.taxMethod() != null) {
            salaryProfiles.fromAmendment(contract, saved, request.baseSalary(), request.insuranceSalary(),
                    request.allowancesJson(), request.insured(), request.taxMethod(), request.overrideReason());
        }
        return ContractAmendmentResponse.from(saved);
    }

    private EmploymentContract findContract(UUID employeeId, UUID id) {
        EmploymentContract contract = contracts.findById(id).orElseThrow(() ->
                error(HttpStatus.NOT_FOUND, "contract.not_found", "Contract not found"));
        if (!contract.getEmployeeId().equals(employeeId)) {
            throw error(HttpStatus.NOT_FOUND, "contract.not_found", "Contract not found");
        }
        return contract;
    }

    static void validate(EmploymentContractRequest request) {
        if (request == null || blank(request.contractNumber()) || blank(request.contractType())
                || request.signedOn() == null || request.startsOn() == null
                || request.baseSalary() == null || request.baseSalary().signum() < 0
                || (request.insuranceSalary() != null && request.insuranceSalary().signum() < 0)
                || (request.endsOn() != null && request.endsOn().isBefore(request.startsOn()))) {
            throw error(HttpStatus.BAD_REQUEST, "contract.invalid_fields", "Invalid contract fields");
        }
    }

    /** Defaults are deterministic; explicit departures require an auditable reason. */
    private static boolean insuranceFlag(EmploymentContractRequest request) {
        boolean defaultInsured = !"PROBATION".equalsIgnoreCase(request.contractType());
        boolean actual = request.insured() == null ? defaultInsured : request.insured();
        if (actual != defaultInsured && blank(request.overrideReason())) {
            throw error(HttpStatus.BAD_REQUEST,"contract.override_reason_required",
                    "Insurance override requires a reason");
        }
        return actual;
    }

    private static String taxMethod(EmploymentContractRequest request) {
        String defaultTax = "PROBATION".equalsIgnoreCase(request.contractType())
                ? "WITHHOLD_10" : "PROGRESSIVE";
        String actual = blank(request.taxMethod()) ? defaultTax : request.taxMethod().trim();
        if (!actual.equals(defaultTax) && blank(request.overrideReason())) {
            throw error(HttpStatus.BAD_REQUEST,"contract.override_reason_required",
                    "Tax method override requires a reason");
        }
        return actual;
    }

    private void rejectOverlap(UUID employeeId, UUID exceptId, EmploymentContractRequest request) {
        if (contracts.overlaps(employeeId, exceptId, request.startsOn(), request.endsOn())) {
            throw error(HttpStatus.CONFLICT, "contract.overlap", "Contracts must not overlap");
        }
    }

    private static boolean blank(String value) { return value == null || value.isBlank(); }
    private static ApiException error(HttpStatus status, String code, String detail) {
        return new ApiException(status, code, detail);
    }
}
