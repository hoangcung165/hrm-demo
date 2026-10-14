package com.hrmdemo.service.employee;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.catalog.CatalogItemRef;
import com.hrmdemo.entity.catalog.Catalog;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.EmployeeCertificate;
import com.hrmdemo.entity.employee.EmployeeSkill;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.employee.EmployeeAttachmentRepository;
import com.hrmdemo.repository.employee.EmployeeCertificateRepository;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.repository.employee.EmployeeSkillRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.catalog.CatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** HRM-09 qualifications on an Employee profile, with the existing employee data scope. */
@Service
@RequiredArgsConstructor
public class EmployeeQualificationsService {
    public record SkillRequest(UUID skillId, Integer level) {}
    public record SkillView(UUID id, CatalogItemRef skill, int level) {}
    public record CertificateRequest(String name, String issuer, LocalDate issuedAt, LocalDate expiresAt,
            UUID attachmentId) {}
    public record CertificateView(UUID id, String name, String issuer, LocalDate issuedAt, LocalDate expiresAt,
            UUID attachmentId) {}

    private final EmployeeRepository employees;
    private final EmployeeSkillRepository skills;
    private final EmployeeCertificateRepository certificates;
    private final EmployeeAttachmentRepository attachments;
    private final CatalogService catalog;
    private final AccessScopeService accessScopes;
    private final Clock clock;

    private static ApiException missing() {
        return new ApiException(HttpStatus.NOT_FOUND, "employee.record_not_found", "Employee record not found");
    }

    private static ApiException invalid(String field) {
        return new ApiException(HttpStatus.BAD_REQUEST, "employee.invalid_field", "Invalid field: " + field)
                .with("field", field);
    }

    private void authorize(CurrentAccount caller, UUID employeeId, boolean edit) {
        AccessScope scope = accessScopes.scopeOf(caller);
        boolean own = employeeId.equals(caller.employeeId());
        if (edit) scope.require(Permission.EMPLOYEE_EDIT);
        else if (!own) scope.require(Permission.EMPLOYEE_VIEW);
        Employee employee = employees.findById(employeeId).orElseThrow(EmployeeQualificationsService::missing);
        if (edit || !own) scope.requireEmployee(employeeId, employee.getOrgUnitId());
    }

    private CatalogItemRef validSkill(SkillRequest input, boolean allowInactive) {
        if (input == null || input.skillId() == null) throw invalid("skillId");
        if (input.level() == null || input.level() < 1 || input.level() > 5) throw invalid("level");
        CatalogItemRef item = catalog.findItem(Catalog.SKILL, input.skillId()).orElseThrow(() -> invalid("skillId"));
        if (!allowInactive && !item.active()) throw invalid("skillId");
        return item;
    }

    private static CertificateRequest validCertificate(CertificateRequest input) {
        if (input == null) throw invalid("certificate");
        String name = EmployeeProfileRecordsRules.required(input.name(), "name", 150);
        String issuer = EmployeeComplianceRules.optionalText(input.issuer(), "issuer", 150);
        if (input.expiresAt() != null && input.issuedAt() != null
                && input.expiresAt().isBefore(input.issuedAt())) throw invalid("expiresAt");
        return new CertificateRequest(name, issuer, input.issuedAt(), input.expiresAt(), input.attachmentId());
    }

    private void requireOwnAttachment(UUID employeeId, UUID attachmentId) {
        if (attachmentId != null && attachments.findByIdAndEmployeeId(attachmentId, employeeId).isEmpty()) {
            throw invalid("attachmentId");
        }
    }

    private static CertificateView view(EmployeeCertificate certificate) {
        return new CertificateView(certificate.getId(), certificate.getName(), certificate.getIssuer(),
                certificate.getIssuedAt(), certificate.getExpiresAt(), certificate.getAttachmentId());
    }

    @Transactional(readOnly = true)
    public List<SkillView> skills(CurrentAccount caller, UUID employeeId) {
        authorize(caller, employeeId, false);
        List<EmployeeSkill> records = skills.findByEmployeeIdOrderByCreatedAtAsc(employeeId);
        Map<UUID, CatalogItemRef> items = catalog.findItems(Catalog.SKILL,
                records.stream().map(EmployeeSkill::getSkillId).collect(Collectors.toSet()));
        return records.stream().map(s -> new SkillView(s.getId(), items.get(s.getSkillId()), s.getLevel())).toList();
    }

    @Transactional
    public SkillView addSkill(CurrentAccount caller, UUID employeeId, SkillRequest input) {
        authorize(caller, employeeId, true);
        CatalogItemRef item = validSkill(input, false);
        employees.lockForRecordEdit(employeeId).orElseThrow(EmployeeQualificationsService::missing);
        if (skills.existsByEmployeeIdAndSkillId(employeeId, item.id())) {
            throw new ApiException(HttpStatus.CONFLICT, "employee.skill_duplicate", "Employee already has this skill");
        }
        EmployeeSkill saved = skills.save(new EmployeeSkill(employeeId, item.id(), input.level(), clock.instant()));
        return new SkillView(saved.getId(), item, saved.getLevel());
    }

    @Transactional
    public SkillView editSkill(CurrentAccount caller, UUID employeeId, UUID id, SkillRequest input) {
        authorize(caller, employeeId, true);
        employees.lockForRecordEdit(employeeId).orElseThrow(EmployeeQualificationsService::missing);
        EmployeeSkill record = skills.findByIdAndEmployeeId(id, employeeId)
                .orElseThrow(EmployeeQualificationsService::missing);
        CatalogItemRef item = validSkill(input, record.getSkillId().equals(input == null ? null : input.skillId()));
        if (skills.existsByEmployeeIdAndSkillIdAndIdNot(employeeId, item.id(), id)) {
            throw new ApiException(HttpStatus.CONFLICT, "employee.skill_duplicate", "Employee already has this skill");
        }
        record.edit(item.id(), input.level(), clock.instant());
        return new SkillView(id, item, record.getLevel());
    }

    @Transactional
    public void deleteSkill(CurrentAccount caller, UUID employeeId, UUID id) {
        authorize(caller, employeeId, true);
        EmployeeSkill record = skills.findByIdAndEmployeeId(id, employeeId)
                .orElseThrow(EmployeeQualificationsService::missing);
        skills.delete(record);
    }

    @Transactional(readOnly = true)
    public List<CertificateView> certificates(CurrentAccount caller, UUID employeeId) {
        authorize(caller, employeeId, false);
        return certificates.findByEmployeeIdOrderByCreatedAtAsc(employeeId).stream()
                .map(EmployeeQualificationsService::view).toList();
    }

    @Transactional
    public CertificateView addCertificate(CurrentAccount caller, UUID employeeId, CertificateRequest input) {
        authorize(caller, employeeId, true);
        CertificateRequest checked = validCertificate(input);
        requireOwnAttachment(employeeId, checked.attachmentId());
        EmployeeCertificate saved = certificates.save(new EmployeeCertificate(employeeId, checked.name(),
                checked.issuer(), checked.issuedAt(), checked.expiresAt(), checked.attachmentId(), clock.instant()));
        return view(saved);
    }

    @Transactional
    public CertificateView editCertificate(CurrentAccount caller, UUID employeeId, UUID id,
            CertificateRequest input) {
        authorize(caller, employeeId, true);
        CertificateRequest checked = validCertificate(input);
        requireOwnAttachment(employeeId, checked.attachmentId());
        EmployeeCertificate record = certificates.findByIdAndEmployeeId(id, employeeId)
                .orElseThrow(EmployeeQualificationsService::missing);
        record.edit(checked.name(), checked.issuer(), checked.issuedAt(), checked.expiresAt(),
                checked.attachmentId(), clock.instant());
        return view(record);
    }

    @Transactional
    public void deleteCertificate(CurrentAccount caller, UUID employeeId, UUID id) {
        authorize(caller, employeeId, true);
        EmployeeCertificate record = certificates.findByIdAndEmployeeId(id, employeeId)
                .orElseThrow(EmployeeQualificationsService::missing);
        certificates.delete(record);
    }
}
