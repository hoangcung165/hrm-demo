package com.hrmdemo.service.employee;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.employee.ContractTemplateSummary;
import com.hrmdemo.entity.employee.ContractTemplate;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.EmploymentContract;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.employee.ContractTemplateRepository;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.repository.employee.EmploymentContractRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.dto.accessscope.DataScope;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/** Versioned template administration and scoped document export. */
@Service
@RequiredArgsConstructor
public class ContractDocumentService {
    private static final int MAX_TEMPLATE_BYTES = 2 * 1024 * 1024;
    private final ContractTemplateRepository templates;
    private final EmploymentContractRepository contracts;
    private final EmployeeRepository employees;
    private final AccessScopeService scopes;
    private final ContractPdfConverter pdf;
    private final Clock clock;

    public record Export(String fileName,String contentType,byte[] bytes) {}

    private static ApiException error(HttpStatus status,String code,String detail) {
        return new ApiException(status,code,detail);
    }
    private void requireAdmin(CurrentAccount caller) {
        AccessScope scope = scopes.scopeOf(caller);
        scope.require(Permission.EMPLOYEE_EDIT);
        scope.require(Permission.EMPLOYEE_SENSITIVE_VIEW);
        if (scope.dataScope() != DataScope.COMPANY) {
            throw error(HttpStatus.FORBIDDEN,"auth.forbidden","Template management requires company scope");
        }
    }

    @Transactional(readOnly = true)
    public List<ContractTemplateSummary> list(CurrentAccount caller,String type) {
        requireAdmin(caller);
        return templates.findByContractTypeOrderByVersionDesc(type).stream()
                .map(ContractTemplateSummary::from).toList();
    }

    @Transactional
    public ContractTemplateSummary upload(CurrentAccount caller,String type,MultipartFile file) {
        requireAdmin(caller);
        if (type == null || !type.matches("[A-Z][A-Z0-9_]{1,39}")) {
            throw error(HttpStatus.BAD_REQUEST,"contract_template.type_invalid","Invalid document type");
        }
        if (file == null || file.isEmpty() || file.getSize() > MAX_TEMPLATE_BYTES
                || file.getOriginalFilename() == null
                || !file.getOriginalFilename().toLowerCase(java.util.Locale.ROOT).endsWith(".docx")) {
            throw error(HttpStatus.BAD_REQUEST,"contract_template.file_invalid","DOCX up to 2 MiB required");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
            try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
                if (doc.getParagraphs().isEmpty() && doc.getTables().isEmpty()) {
                    throw error(HttpStatus.BAD_REQUEST,"contract_template.empty","Template is empty");
                }
            }
        } catch (IOException | RuntimeException ex) {
            if (ex instanceof ApiException api) throw api;
            throw error(HttpStatus.BAD_REQUEST,"contract_template.file_invalid","Cannot parse DOCX");
        }
        List<ContractTemplate> existing = templates.findByContractTypeOrderByVersionDesc(type);
        int version = existing.isEmpty() ? 1 : existing.get(0).getVersion()+1;
        for (ContractTemplate prior : existing) if (prior.isActive()) prior.deactivate();
        // Write the deactivation first: the new row is inserted before pending updates otherwise, and the
        // unique index allows one active version per type.
        templates.flush();
        ContractTemplate saved = templates.save(new ContractTemplate(type,version,
                file.getOriginalFilename(),bytes,caller.id(),clock.instant()));
        return ContractTemplateSummary.from(saved);
    }

    @Transactional(readOnly = true)
    public Export export(CurrentAccount caller,UUID employeeId,UUID contractId,String format) {
        AccessScope scope = scopes.scopeOf(caller);
        scope.require(Permission.EMPLOYEE_VIEW);
        scope.require(Permission.EMPLOYEE_SENSITIVE_VIEW);
        Employee employee = employees.findById(employeeId).orElseThrow(() ->
                error(HttpStatus.NOT_FOUND,"employee.not_found","Employee not found"));
        scope.requireEmployee(employeeId,employee.getOrgUnitId());
        EmploymentContract contract = contracts.findById(contractId).orElseThrow(() ->
                error(HttpStatus.NOT_FOUND,"contract.not_found","Contract not found"));
        if (!contract.getEmployeeId().equals(employeeId)) {
            throw error(HttpStatus.NOT_FOUND,"contract.not_found","Contract not found");
        }
        ContractTemplate template = templates.findFirstByContractTypeAndActiveTrue(contract.getContractType())
                .orElseThrow(() -> error(HttpStatus.CONFLICT,"contract_template.not_found",
                        "No active DOCX template for contract type"));
        Map<String,String> fields = ContractMergeValues.of(employee,contract);
        byte[] word = ContractDocxMerge.merge(template.getContent(),fields);
        String base = "contract-"+contract.getId();
        if ("docx".equalsIgnoreCase(format)) {
            return new Export(base+".docx",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",word);
        }
        if ("pdf".equalsIgnoreCase(format)) {
            return new Export(base+".pdf","application/pdf",pdf.convert(word));
        }
        throw error(HttpStatus.BAD_REQUEST,"contract_export.invalid_format","Use docx or pdf");
    }
}
