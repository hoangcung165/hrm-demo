package com.hrmdemo.service.employee;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.employee.ExpiryType;
import com.hrmdemo.dto.employee.ExpiryPolicyRequest;
import com.hrmdemo.dto.employee.ExpiryPolicyResponse;
import com.hrmdemo.entity.audit.AuditAction;
import com.hrmdemo.entity.employee.ExpiryPolicy;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.employee.ExpiryPolicyRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.audit.AuditRecorder;
import com.hrmdemo.service.audit.AuditRegistrations;
import com.hrmdemo.service.legalentity.LegalEntityService;
import java.time.Clock;
import java.util.Arrays;
import java.util.Collections;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ExpiryPolicyService {
    private final ExpiryPolicyRepository policies;
    private final AccessScopeService scopes;
    private final LegalEntityService legalEntity;
    private final AuditRecorder audit;
    private final Clock clock;

    @Transactional(readOnly = true)
    public ExpiryPolicyResponse get(CurrentAccount caller) {
        var scope = scopes.scopeOf(caller);
        scope.require(Permission.COMPANY_VIEW);
        return new ExpiryPolicyResponse(values(policies.findAll()), scope.has(Permission.COMPANY_EDIT));
    }

    @Transactional
    public ExpiryPolicyResponse update(CurrentAccount caller, ExpiryPolicyRequest request) {
        scopes.scopeOf(caller).require(Permission.COMPANY_EDIT);
        Map<ExpiryType, Integer> days = request == null ? null : request.advanceDays();
        if (days == null || days.size() != ExpiryType.values().length
                || Arrays.stream(ExpiryType.values()).anyMatch(type -> days.get(type) == null
                    || days.get(type) < 0 || days.get(type) > 365)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "expiry.invalid_policy",
                    "Provide every expiry type with advance days between 0 and 365");
        }
        legalEntity.lockForStructureChange();
        List<ExpiryPolicy> rows = policies.findAll();
        Map<ExpiryType, Integer> before = values(rows);
        rows.forEach(row -> row.update(days.get(row.getDocumentType()), caller.id(), clock.instant()));
        audit.recordCompanyWide(caller, AuditRegistrations.EXPIRY_POLICY, AuditAction.UPDATE,
                "Expiry warning windows changed", auditValues(before), auditValues(days));
        return new ExpiryPolicyResponse(values(rows), true);
    }

    private static Map<ExpiryType, Integer> values(List<ExpiryPolicy> rows) {
        EnumMap<ExpiryType, Integer> result = new EnumMap<>(ExpiryType.class);
        rows.forEach(row -> result.put(row.getDocumentType(), row.getAdvanceDays()));
        if (result.size() != ExpiryType.values().length) throw new IllegalStateException("Expiry policies are missing");
        return Collections.unmodifiableMap(result);
    }

    private static Map<String, Integer> auditValues(Map<ExpiryType, Integer> days) {
        Map<String, Integer> result = new LinkedHashMap<>();
        Arrays.stream(ExpiryType.values()).forEach(type -> result.put(type.name(), days.get(type)));
        return result;
    }
}
