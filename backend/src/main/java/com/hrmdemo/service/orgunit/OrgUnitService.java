package com.hrmdemo.service.orgunit;

import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.legalentity.CompanyInfoResponse;
import com.hrmdemo.dto.orgunit.OrgRootResponse;
import com.hrmdemo.dto.orgunit.OrgStructureResponse;
import com.hrmdemo.dto.orgunit.OrgUnitCreateRequest;
import com.hrmdemo.dto.orgunit.OrgUnitHead;
import com.hrmdemo.dto.orgunit.OrgUnitMoveRequest;
import com.hrmdemo.dto.orgunit.OrgUnitResponse;
import com.hrmdemo.dto.orgunit.OrgUnitSummary;
import com.hrmdemo.dto.orgunit.OrgUnitUpdateRequest;
import com.hrmdemo.entity.orgunit.OrgUnit;
import com.hrmdemo.entity.orgunit.OrgUnitType;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.mapper.orgunit.OrgUnitMapper;
import com.hrmdemo.repository.orgunit.OrgUnitRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.legalentity.LegalEntityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The org tree of the Pháp nhân: Company → Đơn vị tổ chức at any depth, each with an optional Trưởng đơn vị.
 * The company is the top of the tree but not a unit, so "under the company" is a null parent.
 * <p>
 * Every change first takes the company-wide lock ({@link LegalEntityService#lockForStructureChange()}) and
 * then reads all units, so two changes at the same time cannot build a cycle, reuse a code, or delete a
 * unit that just got a child.
 */
@Service
@RequiredArgsConstructor
public class OrgUnitService {

    private final OrgUnitRepository orgUnits;
    private final OrgUnitMembers members;
    private final LegalEntityService legalEntityService;
    private final AccessScopeService accessScopes;
    private final OrgUnitMapper mapper;
    private final Clock clock;

    /** The whole tree, inactive units included, with the company on top. */
    @Transactional(readOnly = true)
    public OrgStructureResponse structure(CurrentAccount account) {
        accessScopes.scopeOf(account).require(Permission.ORG_VIEW);
        List<OrgUnit> units = orgUnits.findAll();
        OrgTree tree = new OrgTree(units);
        Map<UUID, Long> direct = members.headcountByOrgUnit();
        Map<UUID, Long> totals = tree.rollUp(direct);
        Map<UUID, OrgUnitHead> heads = members.findHeads(units.stream()
                .map(OrgUnit::getHeadEmployeeId)
                .filter(Objects::nonNull)
                .distinct()
                .toList());

        List<OrgUnitResponse> responses = tree.inDisplayOrder().stream()
                .map(unit -> toResponse(unit, tree, direct, totals, heads))
                .toList();
        long employeeCount = members.companyHeadcount();
        long inUnits = units.stream().mapToLong(unit -> direct.getOrDefault(unit.getId(), 0L)).sum();
        CompanyInfoResponse company = legalEntityService.companyInfo();
        OrgRootResponse root = new OrgRootResponse(company.name(), OrgRootResponse.TYPE, companyHead(company),
                Math.max(0, employeeCount - inUnits), employeeCount, tree.childrenOf(null).size());
        int activeUnits = (int) units.stream().filter(OrgUnit::isActive).count();
        return new OrgStructureResponse(root, responses, new OrgStructureResponse.Summary(activeUnits, employeeCount));
    }

    /** A new unit is active and goes last among its siblings. */
    @Transactional
    public OrgUnitResponse create(CurrentAccount account, OrgUnitCreateRequest request) {
        return create(unitsForChange(account), request);
    }

    /**
     * {@link #create} for code that runs without a signed-in Account (startup seeders): the same lock and
     * rules, no permission check. Never call it on behalf of a request.
     */
    @Transactional
    public OrgUnitResponse createAsSystem(OrgUnitCreateRequest request) {
        return create(lockedUnits(), request);
    }

    private OrgUnitResponse create(List<OrgUnit> units, OrgUnitCreateRequest request) {
        OrgTree tree = new OrgTree(units);
        if (request.parentId() != null) {
            requireActiveParent(tree, request.parentId());
        }
        requireCodeFree(units, request.code(), null);
        if (request.headEmployeeId() != null) {
            requireHead(request.headEmployeeId());
        }
        OrgUnit unit = orgUnits.save(new OrgUnit(request.parentId(), request.code(), request.name(),
                OrgUnitType.valueOf(request.type()), request.headEmployeeId(),
                tree.nextSortOrder(request.parentId()), clock.instant()));
        units.add(unit);
        return toResponse(unit, units);
    }

    /** Changes name, code, type and head. The parent and the status are not touched. */
    @Transactional
    public OrgUnitResponse update(CurrentAccount account, UUID id, OrgUnitUpdateRequest request) {
        List<OrgUnit> units = unitsForChange(account);
        OrgUnit unit = require(units, id);
        requireCodeFree(units, request.code(), unit);
        // An unchanged head is not checked again: editing the name must still work after the head left.
        if (request.headEmployeeId() != null && !request.headEmployeeId().equals(unit.getHeadEmployeeId())) {
            requireHead(request.headEmployeeId());
        }
        unit.update(request.name(), request.code(), OrgUnitType.valueOf(request.type()), request.headEmployeeId(),
                clock.instant());
        return toResponse(unit, units);
    }

    /**
     * Moves a unit, with everything below it, under another parent or directly under the company.
     * The unit keeps its child units, head and code and goes last among its new siblings.
     */
    @Transactional
    public OrgUnitResponse move(CurrentAccount account, UUID id, OrgUnitMoveRequest request) {
        List<OrgUnit> units = unitsForChange(account);
        OrgUnit unit = require(units, id);
        UUID newParentId = request.parentId();
        if (Objects.equals(newParentId, unit.getParentId())) {
            // Already there: nothing to do, and the unit keeps its place among its siblings.
            return toResponse(unit, units);
        }
        OrgTree tree = new OrgTree(units);
        if (newParentId != null) {
            if (tree.isSelfOrDescendant(unit.getId(), newParentId)) {
                throw new ApiException(HttpStatus.CONFLICT, "org_unit.move_into_self_or_descendant",
                        "A unit cannot be moved into itself or into a unit below it");
            }
            requireActiveParent(tree, newParentId);
        }
        unit.moveTo(newParentId, tree.nextSortOrder(newParentId), clock.instant());
        return toResponse(unit, units);
    }

    /** Always allowed. Child units and Employees stay as they are: there is no cascade. */
    @Transactional
    public OrgUnitResponse deactivate(CurrentAccount account, UUID id) {
        return deactivate(unitsForChange(account), id);
    }

    /** {@link #deactivate} without a signed-in Account; see {@link #createAsSystem}. */
    @Transactional
    public OrgUnitResponse deactivateAsSystem(UUID id) {
        return deactivate(lockedUnits(), id);
    }

    private OrgUnitResponse deactivate(List<OrgUnit> units, UUID id) {
        OrgUnit unit = require(units, id);
        if (unit.isActive()) {
            unit.deactivate(clock.instant());
        }
        return toResponse(unit, units);
    }

    /** Always allowed, also under an inactive parent. */
    @Transactional
    public OrgUnitResponse reactivate(CurrentAccount account, UUID id) {
        List<OrgUnit> units = unitsForChange(account);
        OrgUnit unit = require(units, id);
        if (!unit.isActive()) {
            unit.reactivate(clock.instant());
        }
        return toResponse(unit, units);
    }

    /** Only an empty unit can be deleted: no child units (active or not) and no Employees. */
    @Transactional
    public void delete(CurrentAccount account, UUID id) {
        List<OrgUnit> units = unitsForChange(account);
        OrgUnit unit = require(units, id);
        int childCount = new OrgTree(units).childrenOf(id).size();
        long employeeCount = members.countAssigned(id);
        if (childCount > 0 || employeeCount > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "org_unit.not_empty",
                    "A unit with employees or child units cannot be deleted; deactivate it instead")
                    .with("employeeCount", employeeCount)
                    .with("childCount", childCount);
        }
        orgUnits.delete(unit);
    }

    /** Whether the company has any unit, active or not. No permission check: for startup seeders only. */
    @Transactional(readOnly = true)
    public boolean hasUnits() {
        return orgUnits.count() > 0;
    }

    /**
     * One unit, active or not; empty when the company has no unit with this id. For other features' services:
     * no permission check, never return it to a caller that may not see the org structure as a whole.
     */
    @Transactional(readOnly = true)
    public Optional<OrgUnitSummary> find(UUID id) {
        return orgUnits.findById(id).map(OrgUnitService::toSummary);
    }

    /**
     * The unit and every unit above it, nearest first, active or not; empty when there is no unit with this id.
     * What the default Quản lý trực tiếp walks up. For other features' services: no permission check.
     */
    @Transactional(readOnly = true)
    public List<OrgUnitSummary> selfAndAncestors(UUID id) {
        return new OrgTree(orgUnits.findAll()).selfAndAncestors(id).stream()
                .map(OrgUnitService::toSummary)
                .toList();
    }

    private static OrgUnitSummary toSummary(OrgUnit unit) {
        return new OrgUnitSummary(unit.getId(), unit.getParentId(), unit.getCode(), unit.getName(), unit.isActive(),
                unit.getHeadEmployeeId());
    }

    /** Permission check, then the lock, then the units: the order matters (see the class comment). */
    private List<OrgUnit> unitsForChange(CurrentAccount account) {
        accessScopes.scopeOf(account).require(Permission.ORG_EDIT);
        return lockedUnits();
    }

    private List<OrgUnit> lockedUnits() {
        legalEntityService.lockForStructureChange();
        return new ArrayList<>(orgUnits.findAll());
    }

    private static OrgUnit require(List<OrgUnit> units, UUID id) {
        return units.stream()
                .filter(unit -> unit.getId().equals(id))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "org_unit.not_found",
                        "Organization unit not found"));
    }

    /** Inactive units take no new child units, neither new ones nor moved ones. */
    private static void requireActiveParent(OrgTree tree, UUID parentId) {
        OrgUnit parent = tree.find(parentId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "org_unit.parent_not_found",
                        "The parent unit does not exist"));
        if (!parent.isActive()) {
            throw new ApiException(HttpStatus.CONFLICT, "org_unit.parent_inactive", "The parent unit is inactive");
        }
    }

    /** Codes are unique in the company whatever the case; {@code self} is the unit being edited, if any. */
    private void requireCodeFree(List<OrgUnit> units, String code, OrgUnit self) {
        units.stream()
                .filter(other -> other != self && other.getCode().equalsIgnoreCase(code))
                .findFirst()
                .ifPresent(holder -> {
                    throw new ApiException(HttpStatus.CONFLICT, "org_unit.code_taken",
                            "The code is already used by another unit")
                            .with("holder", mapper.toRef(holder));
                });
    }

    /** The head may be any active Employee of the company, not only a member of the unit. */
    private void requireHead(UUID employeeId) {
        if (members.findHead(employeeId).isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "org_unit.head_not_found",
                    "The head is not an active employee of the company");
        }
    }

    /** One unit as the API shows it, with the counts worked out from all units. */
    private OrgUnitResponse toResponse(OrgUnit unit, List<OrgUnit> units) {
        OrgTree tree = new OrgTree(units);
        Map<UUID, Long> direct = members.headcountByOrgUnit();
        Map<UUID, OrgUnitHead> heads = unit.getHeadEmployeeId() == null
                ? Map.of()
                : members.findHeads(List.of(unit.getHeadEmployeeId()));
        return toResponse(unit, tree, direct, tree.rollUp(direct), heads);
    }

    private OrgUnitResponse toResponse(OrgUnit unit, OrgTree tree, Map<UUID, Long> direct, Map<UUID, Long> totals,
            Map<UUID, OrgUnitHead> heads) {
        OrgUnitHead head = unit.getHeadEmployeeId() == null ? null : heads.get(unit.getHeadEmployeeId());
        return mapper.toResponse(unit, head, direct.getOrDefault(unit.getId(), 0L),
                totals.getOrDefault(unit.getId(), 0L), tree.childrenOf(unit.getId()).size());
    }

    /** The company node shows the legal representative, who is not looked up among the Employees. */
    private static OrgUnitHead companyHead(CompanyInfoResponse company) {
        if (company.legalRepresentativeName() == null) {
            return null;
        }
        return new OrgUnitHead(null, company.legalRepresentativeName(), null, company.legalRepresentativeTitle(),
                null);
    }
}
