package com.hrmdemo.service.leave;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.MonthDay;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.leave.LeavePolicyValues;
import com.hrmdemo.dto.leave.LeaveTypeCreateRequest;
import com.hrmdemo.dto.leave.LeaveTypeRef;
import com.hrmdemo.dto.leave.LeaveTypeResponse;
import com.hrmdemo.dto.leave.LeaveTypeUpdateRequest;
import com.hrmdemo.dto.leave.LeaveTypesResponse;
import com.hrmdemo.entity.audit.AuditAction;
import com.hrmdemo.entity.leave.LeavePolicy;
import com.hrmdemo.entity.leave.LeaveType;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.leave.LeavePolicyRepository;
import com.hrmdemo.repository.leave.LeaveTypeRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.approval.ApprovalRequestService;
import com.hrmdemo.service.audit.AuditRecorder;
import com.hrmdemo.service.audit.AuditRegistrations;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Loại nghỉ and their Chính sách phép (HRM-18): a settings page, not a catalog, because each type carries rules.
 * Everyone reads the active types with today's policy (the request form); the settings page and every change need
 * {@code LEAVE_POLICY_EDIT}, and every change is audited. A policy is kept as versions with an effective date, so
 * changing it from a date leaves earlier months under the rules they had.
 */
@Service
@RequiredArgsConstructor
public class LeavePolicyService {

    /** The day the default policies (and a new type's first policy, when none is given) are in force from. */
    public static final LocalDate DEFAULTS_FROM = LocalDate.of(2000, 1, 1);

    private static final Pattern CODE = Pattern.compile("[A-Za-z0-9_-]{1,20}");
    private static final DateTimeFormatter EXPIRY = DateTimeFormatter.ofPattern("MM-dd");
    private static final BigDecimal HALF = new BigDecimal("0.5");

    private final LeaveTypeRepository types;
    private final LeavePolicyRepository policies;
    private final AccessScopeService accessScopes;
    private final AuditRecorder audit;
    private final Clock clock;

    /** The active types with the policy in force today, for the request form. */
    @Transactional(readOnly = true)
    public LeaveTypesResponse active(CurrentAccount caller) {
        AccessScope scope = accessScopes.scopeOf(caller);
        LocalDate today = today();
        Map<UUID, List<LeavePolicy>> versions = versionsByType(types.findAll().stream().map(LeaveType::getId).toList());
        List<LeaveTypeResponse> items = types.findAllByOrderBySortOrderAscNameAsc().stream()
                .filter(LeaveType::isActive)
                .map(type -> response(type, versions.getOrDefault(type.getId(), List.of()), today, false))
                .filter(type -> type.policy() != null)
                .toList();
        return new LeaveTypesResponse(items, scope.has(Permission.LEAVE_POLICY_EDIT));
    }

    /** Every type, active or not, with every version of its policy: the settings page. */
    @Transactional(readOnly = true)
    public LeaveTypesResponse all(CurrentAccount caller) {
        accessScopes.scopeOf(caller).require(Permission.LEAVE_POLICY_EDIT);
        return allResponse();
    }

    @Transactional
    public LeaveTypeResponse create(CurrentAccount caller, LeaveTypeCreateRequest request) {
        accessScopes.scopeOf(caller).require(Permission.LEAVE_POLICY_EDIT);
        List<Map<String, String>> errors = new ArrayList<>();
        String code = request == null || request.code() == null ? "" : request.code().strip();
        if (!CODE.matcher(code).matches()) {
            errors.add(error("code", code.isEmpty() ? "required" : "invalid"));
        } else if (types.existsByCodeIgnoreCase(code)) {
            errors.add(error("code", "taken"));
        }
        String name = name(request == null ? null : request.name(), errors);
        LeavePolicyValues policy = request == null ? null : request.policy();
        Checked checked = checkPolicy(policy, "policy.", errors);
        throwIfAny(errors);
        int order = types.findAll().stream().mapToInt(LeaveType::getSortOrder).max().orElse(0) + 1;
        LeaveType type = types.save(new LeaveType(code.toUpperCase(Locale.ROOT), name, order,
                clock.instant()));
        audit.record(caller, AuditRegistrations.LEAVE_TYPE, type.getId(), AuditAction.CREATE,
                "Leave type " + type.getCode() + " added", null, typeValues(type));
        savePolicy(caller, type, checked);
        return response(type, policies.findByLeaveTypeIdOrderByEffectiveFromAsc(type.getId()), today(), true);
    }

    @Transactional
    public LeaveTypeResponse update(CurrentAccount caller, UUID id, LeaveTypeUpdateRequest request) {
        accessScopes.scopeOf(caller).require(Permission.LEAVE_POLICY_EDIT);
        LeaveType type = find(id);
        List<Map<String, String>> errors = new ArrayList<>();
        String name = name(request == null ? null : request.name(), errors);
        Boolean active = request == null ? null : request.active();
        if (active == null) {
            errors.add(error("active", "required"));
        }
        Integer sortOrder = request == null ? null : request.sortOrder();
        if (sortOrder != null && (sortOrder < 1 || sortOrder > 999)) {
            errors.add(error("sortOrder", "invalid"));
        }
        throwIfAny(errors);
        Map<String, Object> before = typeValues(type);
        type.update(name, active, sortOrder == null ? type.getSortOrder() : sortOrder, clock.instant());
        audit.record(caller, AuditRegistrations.LEAVE_TYPE, type.getId(), AuditAction.UPDATE,
                "Leave type " + type.getCode() + " changed", before, typeValues(type));
        return response(type, policies.findByLeaveTypeIdOrderByEffectiveFromAsc(id), today(), true);
    }

    /**
     * Saves a version of the policy: a new one from its effective date, or new values for the version of that date.
     */
    @Transactional
    public LeaveTypeResponse savePolicy(CurrentAccount caller, UUID id, LeavePolicyValues request) {
        accessScopes.scopeOf(caller).require(Permission.LEAVE_POLICY_EDIT);
        LeaveType type = find(id);
        List<Map<String, String>> errors = new ArrayList<>();
        Checked checked = checkPolicy(request, "", errors);
        throwIfAny(errors);
        savePolicy(caller, type, checked);
        return response(type, policies.findByLeaveTypeIdOrderByEffectiveFromAsc(id), today(), true);
    }

    /** The versions of a type's policy, for the Chính sách phép module; empty for an unknown type. */
    @Transactional(readOnly = true)
    public List<LeaveRule> history(UUID leaveTypeId) {
        return policies.findByLeaveTypeIdOrderByEffectiveFromAsc(leaveTypeId).stream()
                .map(LeavePolicyService::rule).toList();
    }

    /** The versions of several types at once. */
    @Transactional(readOnly = true)
    public Map<UUID, List<LeaveRule>> histories(Collection<UUID> leaveTypeIds) {
        Map<UUID, List<LeaveRule>> histories = new HashMap<>();
        versionsByType(leaveTypeIds).forEach((typeId, versions) ->
                histories.put(typeId, versions.stream().map(LeavePolicyService::rule).toList()));
        return histories;
    }

    /** Every type, in list order, as requests and balances name them. */
    @Transactional(readOnly = true)
    public List<LeaveTypeRef> refs() {
        return types.findAllByOrderBySortOrderAscNameAsc().stream().map(LeavePolicyService::ref).toList();
    }

    public static LeaveTypeRef ref(LeaveType type) {
        return new LeaveTypeRef(type.getId(), type.getCode(), type.getName(), type.isActive());
    }

    public static LeaveRule rule(LeavePolicy policy) {
        LeavePolicy.Values v = policy.values();
        return new LeaveRule(policy.getEffectiveFrom(), v.pay(), v.halfDayAllowed(), v.attachmentRequired(),
                v.limited(), v.entitlementDays(), v.seniorityStepYears(), v.accrual(), v.cutOffDay(),
                v.advanceAllowed(), v.maxDaysPerRequest(), v.carryOverMaxDays(),
                v.carryOverExpiry() == null ? null : MonthDay.parse("--" + v.carryOverExpiry()));
    }

    private LeaveTypesResponse allResponse() {
        LocalDate today = today();
        List<LeaveType> all = types.findAllByOrderBySortOrderAscNameAsc();
        Map<UUID, List<LeavePolicy>> versions = versionsByType(all.stream().map(LeaveType::getId).toList());
        return new LeaveTypesResponse(all.stream()
                .map(type -> response(type, versions.getOrDefault(type.getId(), List.of()), today, true))
                .toList(), true);
    }

    private void savePolicy(CurrentAccount caller, LeaveType type, Checked checked) {
        var existing = policies.findByLeaveTypeIdAndEffectiveFrom(type.getId(), checked.effectiveFrom());
        Map<String, Object> after = policyValues(checked.effectiveFrom(), checked.values());
        if (existing.isPresent()) {
            LeavePolicy version = existing.get();
            Map<String, Object> before = policyValues(version.getEffectiveFrom(), version.values());
            version.replace(checked.values(), caller.id(), clock.instant());
            audit.record(caller, AuditRegistrations.LEAVE_POLICY, type.getId(), AuditAction.UPDATE,
                    "Leave policy of " + type.getCode() + " from " + checked.effectiveFrom() + " changed", before,
                    after);
        } else {
            policies.save(new LeavePolicy(type.getId(), checked.effectiveFrom(), checked.values(), caller.id(),
                    clock.instant()));
            audit.record(caller, AuditRegistrations.LEAVE_POLICY, type.getId(), AuditAction.CREATE,
                    "Leave policy of " + type.getCode() + " from " + checked.effectiveFrom() + " added", null, after);
        }
    }

    private record Checked(LocalDate effectiveFrom, LeavePolicy.Values values) {
    }

    /** Every field of a policy, all failing ones at once; a type that is not limited keeps none of the limit fields. */
    private static Checked checkPolicy(LeavePolicyValues p, String prefix, List<Map<String, String>> errors) {
        if (p == null) {
            errors.add(error(prefix.isEmpty() ? "policy" : prefix.substring(0, prefix.length() - 1), "required"));
            return null;
        }
        LocalDate effectiveFrom = p.effectiveFrom();
        if (effectiveFrom == null) {
            errors.add(error(prefix + "effectiveFrom", "required"));
        } else if (effectiveFrom.isBefore(DEFAULTS_FROM) || effectiveFrom.getYear() > 9999) {
            errors.add(error(prefix + "effectiveFrom", "invalid"));
        }
        require(p.pay(), prefix + "pay", errors);
        require(p.halfDayAllowed(), prefix + "halfDayAllowed", errors);
        require(p.attachmentRequired(), prefix + "attachmentRequired", errors);
        require(p.limited(), prefix + "limited", errors);
        Integer cutOffDay = p.cutOffDay() == null ? 15 : p.cutOffDay();
        if (cutOffDay < 1 || cutOffDay > 31) {
            errors.add(error(prefix + "cutOffDay", "invalid"));
        }
        BigDecimal max = p.maxDaysPerRequest();
        if (max != null && !halfDays(max, HALF, new BigDecimal("366"))) {
            errors.add(error(prefix + "maxDaysPerRequest", "invalid"));
        }
        boolean limited = Boolean.TRUE.equals(p.limited());
        BigDecimal entitlement = null;
        Integer step = null;
        boolean advance = false;
        BigDecimal carryOver = null;
        String expiry = null;
        if (limited) {
            entitlement = p.entitlementDays();
            if (entitlement == null) {
                errors.add(error(prefix + "entitlementDays", "required"));
            } else if (!halfDays(entitlement, HALF, new BigDecimal("365"))) {
                errors.add(error(prefix + "entitlementDays", "invalid"));
            }
            if (p.accrual() == null) {
                errors.add(error(prefix + "accrual", "required"));
            }
            step = p.seniorityStepYears() == null || p.seniorityStepYears() == 0 ? null : p.seniorityStepYears();
            if (step != null && (step < 1 || step > 50)) {
                errors.add(error(prefix + "seniorityStepYears", "invalid"));
            }
            advance = Boolean.TRUE.equals(p.advanceAllowed());
            carryOver = p.carryOverMaxDays();
            if (carryOver != null && !halfDays(carryOver, BigDecimal.ZERO, new BigDecimal("365"))) {
                errors.add(error(prefix + "carryOverMaxDays", "invalid"));
            }
            expiry = p.carryOverExpiry() == null || p.carryOverExpiry().isBlank() ? null : p.carryOverExpiry().strip();
            if (expiry != null) {
                try {
                    MonthDay.parse(expiry, EXPIRY);
                } catch (DateTimeException e) {
                    errors.add(error(prefix + "carryOverExpiry", "invalid"));
                }
            }
        }
        if (!errors.isEmpty()) {
            return null;
        }
        return new Checked(effectiveFrom, new LeavePolicy.Values(p.pay(), p.halfDayAllowed(), p.attachmentRequired(),
                limited, entitlement, step, limited ? p.accrual() : null, cutOffDay, advance, max, carryOver,
                expiry));
    }

    /** A whole or half number of days in the range. */
    private static boolean halfDays(BigDecimal value, BigDecimal min, BigDecimal max) {
        return value.compareTo(min) >= 0 && value.compareTo(max) <= 0
                && value.multiply(BigDecimal.TWO).stripTrailingZeros().scale() <= 0;
    }

    private static String name(String requested, List<Map<String, String>> errors) {
        String name = requested == null ? "" : requested.strip();
        if (name.isEmpty()) {
            errors.add(error("name", "required"));
        } else if (name.length() > 100) {
            errors.add(error("name", "too_long"));
        }
        return name;
    }

    private static void require(Object value, String field, List<Map<String, String>> errors) {
        if (value == null) {
            errors.add(error(field, "required"));
        }
    }

    private static Map<String, String> error(String field, String code) {
        return Map.of("field", field, "code", code);
    }

    private static void throwIfAny(List<Map<String, String>> errors) {
        if (!errors.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "validation.invalid", "Request values are invalid")
                    .with("errors", errors);
        }
    }

    private LeaveType find(UUID id) {
        return types.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "leave_type.not_found",
                "No such leave type"));
    }

    private Map<UUID, List<LeavePolicy>> versionsByType(Collection<UUID> typeIds) {
        Map<UUID, List<LeavePolicy>> byType = new HashMap<>();
        if (typeIds.isEmpty()) {
            return byType;
        }
        for (LeavePolicy policy : policies.findByLeaveTypeIdInOrderByEffectiveFromAsc(typeIds)) {
            byType.computeIfAbsent(policy.getLeaveTypeId(), id -> new ArrayList<>()).add(policy);
        }
        return byType;
    }

    private static LeaveTypeResponse response(LeaveType type, List<LeavePolicy> versions, LocalDate today,
            boolean withVersions) {
        LeavePolicy inForce = null;
        for (LeavePolicy version : versions) {
            if (!version.getEffectiveFrom().isAfter(today)) {
                inForce = version;
            }
        }
        if (inForce == null && !versions.isEmpty() && withVersions) {
            inForce = versions.get(0);
        }
        return new LeaveTypeResponse(type.getId(), type.getCode(), type.getName(), type.getSortOrder(),
                type.isActive(), inForce == null ? null : values(inForce),
                withVersions ? versions.stream().map(LeavePolicyService::values).toList() : List.of());
    }

    private static LeavePolicyValues values(LeavePolicy policy) {
        LeavePolicy.Values v = policy.values();
        return new LeavePolicyValues(policy.getEffectiveFrom(), v.pay(), v.halfDayAllowed(), v.attachmentRequired(),
                v.limited(), v.entitlementDays(), v.seniorityStepYears(), v.accrual(), v.cutOffDay(),
                v.advanceAllowed(), v.maxDaysPerRequest(), v.carryOverMaxDays(), v.carryOverExpiry());
    }

    private static Map<String, Object> typeValues(LeaveType type) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("code", type.getCode());
        values.put("name", type.getName());
        values.put("sortOrder", type.getSortOrder());
        values.put("active", type.isActive());
        return values;
    }

    /** Audited values: dates and enums as text, day counts as plain numbers (12.0 and 12 compare equal). */
    private static Map<String, Object> policyValues(LocalDate effectiveFrom, LeavePolicy.Values v) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("effectiveFrom", effectiveFrom.toString());
        values.put("pay", v.pay().name());
        values.put("halfDayAllowed", v.halfDayAllowed());
        values.put("attachmentRequired", v.attachmentRequired());
        values.put("limited", v.limited());
        values.put("entitlementDays", plain(v.entitlementDays()));
        values.put("seniorityStepYears", v.seniorityStepYears());
        values.put("accrual", v.accrual() == null ? null : v.accrual().name());
        values.put("cutOffDay", v.cutOffDay());
        values.put("advanceAllowed", v.advanceAllowed());
        values.put("maxDaysPerRequest", plain(v.maxDaysPerRequest()));
        values.put("carryOverMaxDays", plain(v.carryOverMaxDays()));
        values.put("carryOverExpiry", v.carryOverExpiry());
        return values;
    }

    private static Double plain(BigDecimal value) {
        return value == null ? null : value.doubleValue();
    }

    private LocalDate today() {
        return LocalDate.ofInstant(clock.instant(), ApprovalRequestService.COMPANY_ZONE);
    }
}
