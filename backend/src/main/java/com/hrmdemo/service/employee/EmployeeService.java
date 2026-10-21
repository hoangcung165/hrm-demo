package com.hrmdemo.service.employee;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.catalog.CatalogItemRef;
import com.hrmdemo.dto.employee.AssignmentRef;
import com.hrmdemo.dto.employee.ContactField;
import com.hrmdemo.dto.employee.DefaultManagerResponse;
import com.hrmdemo.dto.employee.EmergencyContact;
import com.hrmdemo.dto.employee.EmployeeCard;
import com.hrmdemo.dto.employee.EmployeeWorkFacts;
import com.hrmdemo.dto.employee.EmployeeContact;
import com.hrmdemo.dto.employee.EmployeeCreateRequest;
import com.hrmdemo.dto.employee.EmployeeIdentity;
import com.hrmdemo.dto.employee.EmployeeIdentityRequest;
import com.hrmdemo.dto.employee.EmployeeJob;
import com.hrmdemo.dto.employee.EmployeeJobRequest;
import com.hrmdemo.dto.employee.EmployeePersonal;
import com.hrmdemo.dto.employee.EmployeePersonalRequest;
import com.hrmdemo.dto.employee.EmployeePersonalUpdateRequest;
import com.hrmdemo.dto.employee.EmployeeRef;
import com.hrmdemo.dto.employee.EmployeeResponse;
import com.hrmdemo.dto.employee.EmployeeUnitRef;
import com.hrmdemo.dto.employee.NextEmployeeCodeResponse;
import com.hrmdemo.dto.orgunit.OrgUnitSummary;
import com.hrmdemo.entity.catalog.Catalog;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.EmployeeCodeCounter;
import com.hrmdemo.entity.employee.EmployeeIdentityFields;
import com.hrmdemo.entity.employee.EmployeeJobFields;
import com.hrmdemo.entity.employee.EmployeePersonalFields;
import com.hrmdemo.entity.employee.EmployeeStatus;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.catalog.CatalogService;
import com.hrmdemo.service.orgunit.OrgUnitService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Nhân viên (Employees): add one, read a profile, edit it part by part, and the helpers of the form.
 * <p>
 * Reading needs {@link Permission#EMPLOYEE_VIEW} within the data scope, except for the caller's own profile.
 * The identity numbers are masked unless the caller has {@link Permission#EMPLOYEE_SENSITIVE_VIEW} or reads
 * its own profile. Adding needs {@link Permission#EMPLOYEE_EDIT}; editing needs it within the data scope, and
 * the identity numbers need {@link Permission#EMPLOYEE_SENSITIVE_VIEW} as well. The code is never edited.
 * <p>
 * The Quản lý trực tiếp is either chosen ({@code manager_id}) or, when null, follows the org tree live: the
 * Trưởng đơn vị of the Employee's unit, or of the nearest unit above whose head is an active Employee other than
 * the Employee itself.
 */
@Service
@RequiredArgsConstructor
public class EmployeeService {

    static final String UNIT_HEAD = "UNIT_HEAD";
    static final String ASSIGNED = "ASSIGNED";

    private final EmployeeRepository employees;
    private final EmployeeCodes codes;
    private final OrgUnitService orgUnitService;
    private final CatalogService catalogService;
    private final AccessScopeService accessScopes;
    private final Clock clock;

    /**
     * Adds an Employee with the next Mã nhân viên. Order: permission, fields, references, data scope, then the
     * code lock, under which the identity numbers are checked for uniqueness and the code is issued.
     */
    @Transactional
    public EmployeeResponse create(CurrentAccount caller, EmployeeCreateRequest request) {
        AccessScope scope = accessScopes.scopeOf(caller);
        scope.require(Permission.EMPLOYEE_EDIT);
        EmployeeFieldRules.Checked checked = EmployeeFieldRules.check(request, LocalDate.now(clock));
        requireReferences(checked.job());
        // A caller limited to some units adds Employees to those units only.
        scope.requireOrgUnit(checked.job().orgUnitId());

        // Every create queues here, so the uniqueness checks below cannot race another create.
        EmployeeCodeCounter counter = codes.lock();
        requireNumbersFree(scope, checked.identity(), null);
        String code = codes.issue(counter);
        Employee employee = employees.save(
                new Employee(code, checked.personal(), checked.identity(), checked.job(), clock.instant()));
        return toResponse(employee, scope.has(Permission.EMPLOYEE_SENSITIVE_VIEW));
    }

    /**
     * {@link #create} for code that runs without a signed-in Account (startup seeders): the same rules and code
     * lock, no permission or scope check. Never call it on behalf of a request.
     *
     * @return the new Employee's id
     */
    @Transactional
    public UUID createAsSystem(EmployeeCreateRequest request) {
        EmployeeFieldRules.Checked checked = EmployeeFieldRules.check(request, LocalDate.now(clock));
        requireReferences(checked.job());
        EmployeeCodeCounter counter = codes.lock();
        if (employees.findFirstByIdNumber(checked.identity().idNumber()).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "employee.id_number_taken",
                    "The CCCD number is used by another employee");
        }
        String code = codes.issue(counter);
        return employees.save(new Employee(code, checked.personal(), checked.identity(), checked.job(),
                clock.instant())).getId();
    }

    /** Whether the company has any Employee, whatever its status. No permission check: for startup seeders only. */
    @Transactional(readOnly = true)
    public boolean hasEmployees() {
        return employees.count() > 0;
    }

    /** One profile: the caller's own, or one within its data scope with EMPLOYEE_VIEW. */
    @Transactional(readOnly = true)
    public EmployeeResponse get(CurrentAccount caller, UUID id) {
        AccessScope scope = accessScopes.scopeOf(caller);
        boolean own = id.equals(caller.employeeId());
        if (!own) {
            scope.require(Permission.EMPLOYEE_VIEW);
        }
        Employee employee = employees.findById(id).orElseThrow(EmployeeService::notFound);
        if (!own) {
            scope.requireEmployee(employee.getId(), employee.getOrgUnitId());
        }
        return toResponse(employee, own || scope.has(Permission.EMPLOYEE_SENSITIVE_VIEW));
    }

    /** Replaces the full name and the "Cá nhân" fields. */
    @Transactional
    public EmployeeResponse editPersonal(CurrentAccount caller, UUID id, EmployeePersonalUpdateRequest request) {
        AccessScope scope = accessScopes.scopeOf(caller);
        Employee employee = editable(scope, id);
        EmployeePersonalFields personal = EmployeeFieldRules.checkPersonal(request, employee.getHireDate(),
                employee.getIdIssueDate(), LocalDate.now(clock));
        employee.editPersonal(personal, clock.instant());
        return toResponse(employee, unmasked(caller, scope, id));
    }

    /** The contact fields of an Employee's profile. No permission check: for the Cập nhật hồ sơ request. */
    @Transactional(readOnly = true)
    public EmployeeContact contactOf(UUID employeeId) {
        return contact(employees.findById(employeeId).orElseThrow(EmployeeService::notFound));
    }

    /**
     * Checks and normalizes proposed contact fields with the rules of the "Cá nhân" form; field errors use the same
     * paths ({@code personal.phone}, {@code personal.emergencyContact.phone}, ...). Nothing is stored.
     */
    @Transactional(readOnly = true)
    public EmployeeContact checkContact(UUID employeeId, String personalEmail, String phone, String address,
            EmergencyContact emergencyContact) {
        Employee employee = employees.findById(employeeId).orElseThrow(EmployeeService::notFound);
        EmployeePersonalUpdateRequest request = new EmployeePersonalUpdateRequest(employee.getFullName(),
                new EmployeePersonalRequest(employee.getDateOfBirth(), employee.getGender().name(), personalEmail,
                        phone, address, emergencyContact));
        EmployeePersonalFields checked = EmployeeFieldRules.checkPersonal(request, employee.getHireDate(),
                employee.getIdIssueDate(), LocalDate.now(clock));
        return new EmployeeContact(checked.personalEmail(), checked.phone(), checked.address(),
                checked.emergencyContactName(), checked.emergencyContactRelationship(),
                checked.emergencyContactPhone());
    }

    /**
     * Writes approved contact changes to the profile; the other fields stay as they are now. No permission check:
     * called when a Cập nhật hồ sơ request is finally approved.
     */
    @Transactional
    public void applyContactChanges(UUID employeeId, Map<ContactField, String> changes) {
        Employee employee = employees.findById(employeeId).orElseThrow(EmployeeService::notFound);
        EmployeeContact contact = contact(employee);
        for (Map.Entry<ContactField, String> change : changes.entrySet()) {
            contact = contact.with(change.getKey(), change.getValue());
        }
        employee.editPersonal(new EmployeePersonalFields(employee.getFullName(), employee.getDateOfBirth(),
                employee.getGender(), contact.personalEmail(), contact.phone(), contact.address(),
                contact.emergencyContactName(), contact.emergencyContactRelationship(),
                contact.emergencyContactPhone()), clock.instant());
    }

    private static EmployeeContact contact(Employee e) {
        return new EmployeeContact(e.getPersonalEmail(), e.getPhone(), e.getAddress(), e.getEmergencyContactName(),
                e.getEmergencyContactRelationship(), e.getEmergencyContactPhone());
    }

    /**
     * Replaces CCCD, its issue date and place, MST and số BHXH. The numbers are checked for uniqueness under the
     * same lock as create, so an edit cannot race a create or another edit into the unique index.
     */
    @Transactional
    public EmployeeResponse editIdentity(CurrentAccount caller, UUID id, EmployeeIdentityRequest request) {
        AccessScope scope = accessScopes.scopeOf(caller);
        scope.require(Permission.EMPLOYEE_SENSITIVE_VIEW);
        Employee employee = editable(scope, id);
        EmployeeIdentityFields identity = EmployeeFieldRules.checkIdentity(request, employee.getDateOfBirth(),
                LocalDate.now(clock));

        codes.lock();
        requireNumbersFree(scope, identity, id);
        employee.editIdentity(identity, clock.instant());
        return toResponse(employee, true);
    }

    /**
     * Replaces the "Công việc" fields. Order: permission, the Employee and its scope, fields, status, references,
     * the target unit's scope, then the manager. A reference equal to the stored one is not checked again, so an
     * Employee of a unit deactivated later stays editable.
     */
    @Transactional
    public EmployeeResponse editJob(CurrentAccount caller, UUID id, EmployeeJobRequest request) {
        AccessScope scope = accessScopes.scopeOf(caller);
        Employee employee = editable(scope, id);
        EmployeeJobFields job = EmployeeFieldRules.checkJob(request, employee.getDateOfBirth(), LocalDate.now(clock));
        requireStatusChange(employee.getStatus(), job.status());

        if (!Objects.equals(job.orgUnitId(), employee.getOrgUnitId())) {
            requireOrgUnit(job.orgUnitId());
        }
        if (!job.positionId().equals(employee.getPositionId())) {
            requirePosition(job.positionId());
        }
        // A caller limited to some units moves Employees within those units only.
        scope.requireOrgUnit(job.orgUnitId());
        if (job.managerId() != null && !job.managerId().equals(employee.getManagerId())) {
            if (job.managerId().equals(id)) {
                throw managerInvalid("SELF");
            }
            requireManager(job.managerId());
            requireNoCycle(id, job.managerId());
        } else if (job.managerId() == null && (employee.getManagerId() != null
                || !Objects.equals(job.orgUnitId(), employee.getOrgUnitId()))) {
            // A new default manager (back to the unit head, or another unit's head) must not lead back here either.
            Optional<Employee> head = unitHead(job.orgUnitId(), id);
            if (head.isPresent()) {
                requireNoCycle(id, head.get().getId());
            }
        }

        employee.editJob(job, clock.instant());
        return toResponse(employee, unmasked(caller, scope, id));
    }

    /**
     * PUT job switches between Thử việc and Chính thức only: Đã nghỉ việc is set by the resignation flow, and an
     * Employee who left is not edited here.
     */
    static void requireStatusChange(EmployeeStatus current, EmployeeStatus requested) {
        if (!current.isActive() || !requested.isActive()) {
            throw new ApiException(HttpStatus.CONFLICT, "employee.status_change_not_allowed",
                    "The status may only switch between PROBATION and OFFICIAL");
        }
    }

    /**
     * Refuses a chosen manager whose effective chain leads back to the Employee. The chain follows each
     * Employee's chosen manager, or else its live default (the unit head), and stops at a repeat.
     */
    void requireNoCycle(UUID employeeId, UUID managerId) {
        Set<UUID> seen = new HashSet<>();
        UUID current = managerId;
        while (current != null && seen.add(current)) {
            if (current.equals(employeeId)) {
                throw managerInvalid("CYCLE");
            }
            Optional<Employee> next = employees.findById(current);
            if (next.isEmpty()) {
                return;
            }
            Employee link = next.get();
            current = link.getManagerId() != null ? link.getManagerId()
                    : unitHead(link.getOrgUnitId(), link.getId()).map(Employee::getId).orElse(null);
        }
    }

    /**
     * What "follow the unit head" resolves to for an Employee of the given unit, for the form's preview.
     *
     * @param orgUnitId  null: directly under the company, which has no default manager
     * @param employeeId the Employee being edited, or null on create
     */
    @Transactional(readOnly = true)
    public DefaultManagerResponse defaultManager(CurrentAccount caller, UUID orgUnitId, UUID employeeId) {
        accessScopes.scopeOf(caller).require(Permission.EMPLOYEE_EDIT);
        if (orgUnitId != null && orgUnitService.find(orgUnitId).isEmpty()) {
            throw orgUnitNotFound();
        }
        return new DefaultManagerResponse(unitHead(orgUnitId, employeeId).map(EmployeeService::toRef).orElse(null));
    }

    /** The code the next new Employee would get; a preview only. */
    @Transactional(readOnly = true)
    public NextEmployeeCodeResponse nextCode(CurrentAccount caller) {
        accessScopes.scopeOf(caller).require(Permission.EMPLOYEE_EDIT);
        return new NextEmployeeCodeResponse(codes.preview());
    }

    /**
     * The Quản lý trực tiếp in force for approvals: the chosen manager while active, else the head found by walking
     * up from the Employee's unit. Empty for an unknown Employee.
     */
    @Transactional(readOnly = true)
    public Optional<UUID> lineManagerId(UUID employeeId) {
        Optional<Employee> employee = employees.findById(employeeId);
        if (employee.isEmpty()) {
            return Optional.empty();
        }
        UUID chosen = employee.get().getManagerId();
        if (chosen != null && employees.findById(chosen).filter(Employee::isActive).isPresent()) {
            return Optional.of(chosen);
        }
        return unitHead(employee.get().getOrgUnitId(), employeeId).map(Employee::getId);
    }

    /**
     * The active head found by walking up from the unit above the Employee's own unit. Empty for an Employee
     * directly under the company or in a top-level unit.
     */
    @Transactional(readOnly = true)
    public Optional<UUID> parentUnitHeadId(UUID employeeId) {
        return employees.findById(employeeId)
                .map(Employee::getOrgUnitId)
                .flatMap(orgUnitService::find)
                .map(OrgUnitSummary::parentId)
                .flatMap(parentId -> unitHead(parentId, employeeId))
                .map(Employee::getId);
    }

    /** Which of the given Employees are active (not Đã nghỉ việc). */
    @Transactional(readOnly = true)
    public Set<UUID> activeIds(Collection<UUID> ids) {
        if (ids.isEmpty()) {
            return Set.of();
        }
        return employees.findAllById(Set.copyOf(ids)).stream().filter(Employee::isActive).map(Employee::getId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    /** The active Employees of the given units, by Employee id with the unit they belong to. No permission check. */
    @Transactional(readOnly = true)
    public Map<UUID, UUID> activeInOrgUnits(Collection<UUID> orgUnitIds) {
        if (orgUnitIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, UUID> members = new java.util.LinkedHashMap<>();
        for (Employee employee : employees.findByOrgUnitIdIn(Set.copyOf(orgUnitIds))) {
            if (employee.isActive()) {
                members.put(employee.getId(), employee.getOrgUnitId());
            }
        }
        return members;
    }

    /** Card, unit, hire date and status of each known Employee; for other features (leave). No permission check. */
    @Transactional(readOnly = true)
    public Map<UUID, EmployeeWorkFacts> workFacts(Collection<UUID> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        Map<UUID, EmployeeCard> cards = cards(ids);
        Map<UUID, EmployeeWorkFacts> facts = new HashMap<>();
        for (Employee employee : employees.findAllById(Set.copyOf(ids))) {
            facts.put(employee.getId(), new EmployeeWorkFacts(cards.get(employee.getId()), employee.getOrgUnitId(),
                    employee.getHireDate(), employee.isActive()));
        }
        return facts;
    }

    /**
     * {@link #workFacts} of one Employee, with their row locked until the transaction ends: a change that depends on
     * the Employee's other records (a leave request against the balance) waits for another one in progress.
     */
    @Transactional
    public Optional<EmployeeWorkFacts> lockWorkFacts(UUID id) {
        return employees.lockForRecordEdit(id).map(employee -> new EmployeeWorkFacts(cards(Set.of(id)).get(id),
                employee.getOrgUnitId(), employee.getHireDate(), employee.isActive()));
    }

    /** Name, code and unit name of each known Employee, for lists that show people (inbox, approval steps). */
    @Transactional(readOnly = true)
    public Map<UUID, EmployeeCard> cards(Collection<UUID> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        Map<UUID, String> unitNames = new HashMap<>();
        Map<UUID, EmployeeCard> cards = new HashMap<>();
        for (Employee employee : employees.findAllById(Set.copyOf(ids))) {
            String unitName = employee.getOrgUnitId() == null ? null : unitNames.computeIfAbsent(
                    employee.getOrgUnitId(), id -> orgUnitService.find(id).map(OrgUnitSummary::name).orElse(null));
            cards.put(employee.getId(), new EmployeeCard(employee.getId(), employee.getCode(), employee.getFullName(),
                    unitName));
        }
        return cards;
    }

    /**
     * The default Quản lý trực tiếp: walking up from the unit, the first head that is an active Employee other
     * than {@code employeeId}. Inactive units count: their people are still there.
     */
    Optional<Employee> unitHead(UUID orgUnitId, UUID employeeId) {
        if (orgUnitId == null) {
            return Optional.empty();
        }
        for (OrgUnitSummary unit : orgUnitService.selfAndAncestors(orgUnitId)) {
            UUID headId = unit.headEmployeeId();
            if (headId == null || headId.equals(employeeId)) {
                continue;
            }
            Optional<Employee> head = employees.findById(headId).filter(Employee::isActive);
            if (head.isPresent()) {
                return head;
            }
        }
        return Optional.empty();
    }

    /** A new unit, position or manager must exist and be active. */
    private void requireReferences(EmployeeJobFields job) {
        requireOrgUnit(job.orgUnitId());
        requirePosition(job.positionId());
        if (job.managerId() != null) {
            requireManager(job.managerId());
        }
    }

    /** @param orgUnitId null: directly under the company, always allowed here */
    private void requireOrgUnit(UUID orgUnitId) {
        if (orgUnitId == null) {
            return;
        }
        OrgUnitSummary unit = orgUnitService.find(orgUnitId).orElseThrow(EmployeeService::orgUnitNotFound);
        if (!unit.active()) {
            throw new ApiException(HttpStatus.CONFLICT, "employee.org_unit_inactive", "The unit is inactive");
        }
    }

    private void requirePosition(UUID positionId) {
        CatalogItemRef position = catalogService.findItem(Catalog.POSITION, positionId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "employee.position_not_found",
                        "The position is not an item of the positions catalog"));
        if (!position.active()) {
            throw new ApiException(HttpStatus.CONFLICT, "employee.position_inactive", "The position is inactive");
        }
    }

    private void requireManager(UUID managerId) {
        if (employees.findById(managerId).filter(Employee::isActive).isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "employee.manager_not_found",
                    "The manager is not an active employee of the company");
        }
    }

    /** The Employee to edit: EMPLOYEE_EDIT, then 404, then the data scope, as GET answers. */
    private Employee editable(AccessScope scope, UUID id) {
        scope.require(Permission.EMPLOYEE_EDIT);
        Employee employee = employees.findById(id).orElseThrow(EmployeeService::notFound);
        scope.requireEmployee(employee.getId(), employee.getOrgUnitId());
        return employee;
    }

    private static boolean unmasked(CurrentAccount caller, AccessScope scope, UUID id) {
        return id.equals(caller.employeeId()) || scope.has(Permission.EMPLOYEE_SENSITIVE_VIEW);
    }

    /**
     * CCCD, MST and số BHXH are each unique in the company.
     *
     * @param self the Employee being edited, whose own numbers do not count; null on create
     */
    private void requireNumbersFree(AccessScope scope, EmployeeIdentityFields identity, UUID self) {
        requireFree(scope, employees.findFirstByIdNumber(identity.idNumber()), self, "employee.id_number_taken",
                "The CCCD number is used by another employee");
        if (identity.taxCode() != null) {
            requireFree(scope, employees.findFirstByTaxCode(identity.taxCode()), self, "employee.tax_code_taken",
                    "The tax code is used by another employee");
        }
        if (identity.socialInsuranceNumber() != null) {
            requireFree(scope, employees.findFirstBySocialInsuranceNumber(identity.socialInsuranceNumber()), self,
                    "employee.social_insurance_number_taken", "The social insurance number is used by another employee");
        }
    }

    /** The holder is named only when the caller may see it. */
    private static void requireFree(AccessScope scope, Optional<Employee> found, UUID self, String code,
            String detail) {
        Optional<Employee> holder = found.filter(other -> !other.getId().equals(self));
        if (holder.isPresent()) {
            ApiException conflict = new ApiException(HttpStatus.CONFLICT, code, detail);
            Employee other = holder.get();
            if (scope.coversEmployee(other.getId(), other.getOrgUnitId())) {
                conflict.with("employee", toRef(other));
            }
            throw conflict;
        }
    }

    private EmployeeResponse toResponse(Employee employee, boolean unmasked) {
        EmergencyContact contact = employee.getEmergencyContactName() == null
                && employee.getEmergencyContactRelationship() == null && employee.getEmergencyContactPhone() == null
                ? null
                : new EmergencyContact(employee.getEmergencyContactName(), employee.getEmergencyContactRelationship(),
                        employee.getEmergencyContactPhone());
        EmployeePersonal personal = new EmployeePersonal(employee.getDateOfBirth(), employee.getGender().name(),
                employee.getPersonalEmail(), employee.getPhone(), employee.getAddress(), contact);
        EmployeeIdentity identity = new EmployeeIdentity(!unmasked,
                shown(employee.getIdNumber(), unmasked), employee.getIdIssueDate(), employee.getIdIssuePlace(),
                shown(employee.getTaxCode(), unmasked), shown(employee.getSocialInsuranceNumber(), unmasked));

        EmployeeUnitRef orgUnit = employee.getOrgUnitId() == null ? null
                : orgUnitService.find(employee.getOrgUnitId())
                        .map(unit -> new EmployeeUnitRef(unit.id(), unit.code(), unit.name(), unit.active(),
                                unit.parentId() == null ? null
                                        : orgUnitService.find(unit.parentId()).map(OrgUnitSummary::name).orElse(null)))
                        .orElse(null);
        AssignmentRef position = catalogService.findItem(Catalog.POSITION, employee.getPositionId())
                .map(item -> new AssignmentRef(item.id(), item.code(), item.name(), item.active()))
                .orElse(null);
        EmployeeRef manager;
        String managerSource;
        if (employee.getManagerId() != null) {
            managerSource = ASSIGNED;
            manager = employees.findById(employee.getManagerId()).map(EmployeeService::toRef).orElse(null);
        } else {
            managerSource = UNIT_HEAD;
            manager = unitHead(employee.getOrgUnitId(), employee.getId()).map(EmployeeService::toRef).orElse(null);
        }
        EmployeeJob job = new EmployeeJob(orgUnit, position, manager, managerSource, employee.getHireDate());
        return new EmployeeResponse(employee.getId(), employee.getCode(), employee.getFullName(),
                employee.getStatus().name(), personal, identity, job, employee.getCreatedAt(), employee.getUpdatedAt());
    }

    private static String shown(String number, boolean unmasked) {
        return unmasked ? number : SensitiveNumbers.mask(number);
    }

    static EmployeeRef toRef(Employee employee) {
        return new EmployeeRef(employee.getId(), employee.getCode(), employee.getFullName());
    }

    private static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "employee.not_found", "Employee not found");
    }

    private static ApiException managerInvalid(String reason) {
        return new ApiException(HttpStatus.BAD_REQUEST, "employee.manager_invalid",
                "The manager would be the employee itself or close a cycle").with("reason", reason);
    }

    private static ApiException orgUnitNotFound() {
        return new ApiException(HttpStatus.BAD_REQUEST, "employee.org_unit_not_found",
                "The unit is not a unit of the company");
    }
}
