package com.hrmdemo.service.employee;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.EmployeeExpatDocument;
import com.hrmdemo.entity.employee.EmployeeInsurance;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.employee.EmployeeExpatDocumentRepository;
import com.hrmdemo.repository.employee.EmployeeInsuranceRepository;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** HRM-08 employee insurance and expat document metadata with existing Employee data-scope rules. */
@Service
@RequiredArgsConstructor
public class EmployeeComplianceService {
    public record InsuranceRequest(LocalDate participationDate, String healthRegistrationPlace,
            String healthInsuranceNumber) {}
    public record InsuranceView(String socialInsuranceNumber, LocalDate participationDate,
            String healthRegistrationPlace, String healthInsuranceNumber, boolean masked) {}
    public record NationalityRequest(String nationality) {}
    public record NationalityView(String nationality) {}
    public record DocumentRequest(String documentType, String documentNumber, String issuingCountry,
            LocalDate issuedAt, LocalDate expiresAt) {}
    public record DocumentView(UUID id, String documentType, String documentNumber, String issuingCountry,
            LocalDate issuedAt, LocalDate expiresAt, boolean masked) {}

    private record Authorized(Employee employee, boolean sensitive) {}

    private final EmployeeRepository employees;
    private final EmployeeInsuranceRepository insuranceRecords;
    private final EmployeeExpatDocumentRepository documentsRepo;
    private final AccessScopeService accessScopes;
    private final Clock clock;

    private static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "employee.record_not_found", "Employee record not found");
    }

    private Authorized authorize(CurrentAccount caller, UUID employeeId, boolean edit, boolean sensitiveEdit) {
        AccessScope scope = accessScopes.scopeOf(caller);
        if (edit) {
            scope.require(Permission.EMPLOYEE_EDIT);
            if (sensitiveEdit) scope.require(Permission.EMPLOYEE_SENSITIVE_VIEW);
        } else if (!employeeId.equals(caller.employeeId())) {
            scope.require(Permission.EMPLOYEE_VIEW);
        }
        Employee employee = employees.findById(employeeId).orElseThrow(EmployeeComplianceService::notFound);
        if (edit || !employeeId.equals(caller.employeeId())) {
            scope.requireEmployee(employee.getId(), employee.getOrgUnitId());
        }
        return new Authorized(employee, employeeId.equals(caller.employeeId())
                || scope.has(Permission.EMPLOYEE_SENSITIVE_VIEW));
    }

    private static String masked(String value, boolean sensitive) {
        return sensitive ? value : SensitiveNumbers.mask(value);
    }

    private static InsuranceView insuranceView(Employee employee, EmployeeInsurance extra, boolean sensitive) {
        return new InsuranceView(masked(employee.getSocialInsuranceNumber(), sensitive),
                extra == null ? null : extra.getParticipationDate(),
                extra == null ? null : extra.getHealthRegistrationPlace(),
                extra == null ? null : masked(extra.getHealthInsuranceNumber(), sensitive), !sensitive);
    }

    @Transactional(readOnly = true)
    public InsuranceView insurance(CurrentAccount caller, UUID employeeId) {
        Authorized authorized = authorize(caller, employeeId, false, false);
        return insuranceView(authorized.employee(), insuranceRecords.findByEmployeeId(employeeId).orElse(null),
                authorized.sensitive());
    }

    @Transactional
    public InsuranceView saveInsurance(CurrentAccount caller, UUID employeeId, InsuranceRequest request) {
        Authorized authorized = authorize(caller, employeeId, true, true);
        if (request == null) throw EmployeeComplianceRules.invalid("insurance");
        String place = EmployeeComplianceRules.optionalText(request.healthRegistrationPlace(),
                "healthRegistrationPlace", 200);
        String card = EmployeeComplianceRules.optionalText(request.healthInsuranceNumber(),
                "healthInsuranceNumber", 40);
        EmployeeInsurance extra = insuranceRecords.findByEmployeeId(employeeId).orElse(null);
        if (extra == null) {
            extra = new EmployeeInsurance(employeeId, request.participationDate(), place, card, clock.instant());
        } else {
            extra.edit(request.participationDate(), place, card, clock.instant());
        }
        return insuranceView(authorized.employee(), insuranceRecords.save(extra), true);
    }

    @Transactional(readOnly = true)
    public NationalityView nationality(CurrentAccount caller, UUID employeeId) {
        return new NationalityView(authorize(caller, employeeId, false, false).employee().getNationality());
    }

    @Transactional
    public NationalityView saveNationality(CurrentAccount caller, UUID employeeId, NationalityRequest request) {
        Employee employee = authorize(caller, employeeId, true, false).employee();
        if (request == null) throw EmployeeComplianceRules.invalid("nationality");
        String nationality = EmployeeComplianceRules.nationality(request.nationality());
        employee.setNationality(nationality, clock.instant());
        return new NationalityView(nationality);
    }

    private static DocumentRequest valid(DocumentRequest request) {
        if (request == null) throw EmployeeComplianceRules.invalid("document");
        EmployeeComplianceRules.dates(request.issuedAt(), request.expiresAt());
        EmployeeExpatDocument.Type type = EmployeeComplianceRules.type(request.documentType());
        String number = EmployeeComplianceRules.documentNumber(request.documentNumber());
        String country = EmployeeComplianceRules.country(request.issuingCountry(), "issuingCountry");
        return new DocumentRequest(type.name(), number, country, request.issuedAt(), request.expiresAt());
    }

    private static DocumentView view(EmployeeExpatDocument doc, boolean sensitive) {
        return new DocumentView(doc.getId(), doc.getDocumentType().name(),
                masked(doc.getDocumentNumber(), sensitive), doc.getIssuingCountry(),
                doc.getIssuedAt(), doc.getExpiresAt(), !sensitive);
    }

    @Transactional(readOnly = true)
    public List<DocumentView> documents(CurrentAccount caller, UUID employeeId) {
        Authorized authorized = authorize(caller, employeeId, false, false);
        return documentsRepo.findByEmployeeIdOrderByExpiresAtAsc(employeeId)
                .stream().map(doc -> view(doc, authorized.sensitive())).toList();
    }

    @Transactional
    public DocumentView addDocument(CurrentAccount caller, UUID employeeId, DocumentRequest request) {
        authorize(caller, employeeId, true, true);
        DocumentRequest checked = valid(request);
        EmployeeExpatDocument document = new EmployeeExpatDocument(employeeId,
                EmployeeExpatDocument.Type.valueOf(checked.documentType()),
                checked.documentNumber(), checked.issuingCountry(),
                checked.issuedAt(), checked.expiresAt(), clock.instant());
        return view(documentsRepo.save(document), true);
    }

    @Transactional
    public DocumentView updateDocument(CurrentAccount caller, UUID employeeId, UUID id, DocumentRequest request) {
        authorize(caller, employeeId, true, true);
        DocumentRequest checked = valid(request);
        EmployeeExpatDocument doc = documentsRepo.findByIdAndEmployeeId(id, employeeId)
                .orElseThrow(EmployeeComplianceService::notFound);
        doc.edit(EmployeeExpatDocument.Type.valueOf(checked.documentType()), checked.documentNumber(),
                checked.issuingCountry(), checked.issuedAt(), checked.expiresAt(), clock.instant());
        return view(doc, true);
    }

    @Transactional
    public void deleteDocument(CurrentAccount caller, UUID employeeId, UUID id) {
        authorize(caller, employeeId, true, true);
        EmployeeExpatDocument doc = documentsRepo.findByIdAndEmployeeId(id, employeeId)
                .orElseThrow(EmployeeComplianceService::notFound);
        documentsRepo.delete(doc);
    }
}
