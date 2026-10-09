package com.hrmdemo.service.approval;

import java.time.Clock;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.approval.ApprovalFlowLevelDto;
import com.hrmdemo.dto.approval.ApprovalFlowRequest;
import com.hrmdemo.dto.approval.ApprovalFlowResponse;
import com.hrmdemo.dto.approval.ApprovalFlowsResponse;
import com.hrmdemo.dto.approval.ApprovalRequestType;
import com.hrmdemo.dto.approval.ApproverRule;
import com.hrmdemo.entity.approval.ApprovalFlowSetting;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.approval.ApprovalFlowSettingRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScopeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Luồng phê duyệt per request type: the default in code ({@link ApprovalFlowDefaults}) unless the company saved its
 * own. Reading and changing the flows needs {@link Permission#APPROVAL_FLOW_EDIT}; {@link #flowOf} is for the
 * approval requests, which take the flow in force when they are sent.
 */
@Service
@RequiredArgsConstructor
public class ApprovalFlowService {

    private final ApprovalFlowSettingRepository settings;
    private final AccessScopeService accessScopes;
    private final Clock clock;

    /** The flow a request of this type is sent with now. */
    @Transactional(readOnly = true)
    public ApprovalFlow flowOf(ApprovalRequestType type) {
        return settings.findByRequestType(type.name()).flatMap(setting -> stored(type, setting))
                .orElseGet(() -> ApprovalFlowDefaults.of(type));
    }

    @Transactional(readOnly = true)
    public ApprovalFlowsResponse list(CurrentAccount caller) {
        accessScopes.scopeOf(caller).require(Permission.APPROVAL_FLOW_EDIT);
        List<ApprovalFlowResponse> items = Arrays.stream(ApprovalRequestType.values())
                .map(type -> response(type, settings.findByRequestType(type.name())))
                .toList();
        return new ApprovalFlowsResponse(items);
    }

    /**
     * Saves the whole flow of one type. Requests already sent keep their flow. A flow equal to the default removes
     * the company's own, so the type follows the default again.
     */
    @Transactional
    public ApprovalFlowResponse update(CurrentAccount caller, ApprovalRequestType type, ApprovalFlowRequest request) {
        accessScopes.scopeOf(caller).require(Permission.APPROVAL_FLOW_EDIT);
        ApprovalFlow flow = new ApprovalFlow(type, levels(request.levels()), request.autoApproveDays(),
                request.delegationAllowed());
        Optional<ApprovalFlowSetting> existing = settings.findByRequestType(type.name());
        if (flow.equals(ApprovalFlowDefaults.of(type))) {
            existing.ifPresent(settings::delete);
            return response(type, Optional.empty());
        }
        ApprovalFlowSetting setting = existing.orElseGet(() -> new ApprovalFlowSetting(type.name()));
        List<ApprovalFlowSetting.Level> stored = flow.levels().stream()
                .map(level -> new ApprovalFlowSetting.Level(level.rule().name(),
                        level.role() == null ? null : level.role().name()))
                .toList();
        setting.update(stored, flow.autoApproveDays(), flow.delegationAllowed(), caller.id(), clock.instant());
        return response(type, Optional.of(settings.save(setting)));
    }

    private ApprovalFlowResponse response(ApprovalRequestType type, Optional<ApprovalFlowSetting> setting) {
        Optional<ApprovalFlow> own = setting.flatMap(s -> stored(type, s));
        ApprovalFlow flow = own.orElseGet(() -> ApprovalFlowDefaults.of(type));
        List<ApprovalFlowLevelDto> levels = flow.levels().stream()
                .map(level -> new ApprovalFlowLevelDto(level.rule(),
                        level.role() == null ? null : level.role().name()))
                .toList();
        return new ApprovalFlowResponse(type, levels, flow.autoApproveDays(), flow.delegationAllowed(),
                type.allowsAutoApproveAndDelegation(), own.isPresent(),
                own.isPresent() ? setting.get().getUpdatedAt() : null);
    }

    /** A stored flow, or empty when a name in it is unknown to this release or it breaks a rule: the default wins. */
    private static Optional<ApprovalFlow> stored(ApprovalRequestType type, ApprovalFlowSetting setting) {
        try {
            List<ApprovalLevel> levels = new ArrayList<>();
            for (ApprovalFlowSetting.Level level : setting.getLevels()) {
                ApproverRule rule = ApproverRule.valueOf(level.getRule());
                levels.add(new ApprovalLevel(rule, level.getRole() == null ? null : Role.valueOf(level.getRole())));
            }
            return Optional.of(new ApprovalFlow(type, levels, setting.getAutoApproveDays(),
                    setting.isDelegationAllowed()));
        } catch (IllegalArgumentException | ApiException e) {
            return Optional.empty();
        }
    }

    /** The levels of a request; a role level needs a role an approver can hold (not "every Employee"). */
    private static List<ApprovalLevel> levels(List<ApprovalFlowLevelDto> requested) {
        List<ApprovalLevel> levels = new ArrayList<>();
        for (int i = 0; i < requested.size(); i++) {
            ApprovalFlowLevelDto level = requested.get(i);
            if (level.rule() != ApproverRule.ROLE) {
                if (level.role() != null) {
                    throw invalidRole(i, "Only a role level names a role");
                }
                levels.add(new ApprovalLevel(level.rule(), null));
                continue;
            }
            int index = i;
            Role role = Arrays.stream(Role.values()).filter(r -> r.name().equals(level.role())).findFirst()
                    .orElseThrow(() -> invalidRole(index, "A role level names a known role"));
            if (role == Role.EMPLOYEE) {
                throw invalidRole(i, "Every Employee holds this role: name the role that approves");
            }
            levels.add(ApprovalLevel.role(role));
        }
        return levels;
    }

    private static ApiException invalidRole(int index, String detail) {
        return new ApiException(HttpStatus.BAD_REQUEST, "approval.flow_role", detail).with("level", index + 1);
    }
}
