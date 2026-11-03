package com.hrmdemo.service.attendance;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.dto.PageResponse;
import com.hrmdemo.dto.approval.ApprovalRequestResponse;
import com.hrmdemo.dto.approval.ApprovalRequestType;
import com.hrmdemo.dto.attendance.AttendanceAdjustmentCheck;
import com.hrmdemo.dto.attendance.AttendanceAdjustmentListItem;
import com.hrmdemo.dto.attendance.AttendanceAdjustmentPayload;
import com.hrmdemo.dto.attendance.AttendanceAdjustmentResponse;
import com.hrmdemo.dto.attendance.AttendanceAdjustmentStatus;
import com.hrmdemo.dto.attendance.DailyAttendanceResponse.Day;
import com.hrmdemo.dto.employee.EmployeeCard;
import com.hrmdemo.dto.leave.LeaveApproversPreview;
import com.hrmdemo.entity.attendance.AttendanceAdjustment;
import com.hrmdemo.entity.shift.ShiftPattern;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.attendance.AttendanceAdjustmentRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.approval.ApprovalEvent;
import com.hrmdemo.service.approval.ApprovalRequestService;
import com.hrmdemo.service.attendance.DailyAttendanceService.DayOf;
import com.hrmdemo.service.employee.EmployeeService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Đơn bổ sung công (HRM-24), a type of Yêu cầu phê duyệt (ATTENDANCE_ADJUSTMENT) that goes through the Luồng phê duyệt
 * "Bổ sung công". An Employee gives the time of a punch they forgot on one of their own days: only a side the day has
 * no time for, never a punched one. The sender can cancel it while it waits or is returned, and edit and send again a
 * returned one. Once approved, the Công theo ngày uses its times for the missing side(s).
 * <p>
 * Who may open a request: its sender and everyone the approval request lets in (approvers, delegates, past actors).
 */
@Service
@RequiredArgsConstructor
public class AttendanceAdjustmentService {

    static final int MAX_REASON = 500;
    static final int MAX_DAYS_BACK = 30;
    static final int MAX_PAGE_SIZE = 100;

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    private final AttendanceAdjustmentRepository requests;
    private final DailyAttendanceService daily;
    private final ApprovalRequestService approvals;
    private final EmployeeService employees;
    private final Clock clock;

    /** What the form needs for one of the caller's days, without saving anything. */
    @Transactional(readOnly = true)
    public AttendanceAdjustmentCheck check(CurrentAccount caller, LocalDate date) {
        UUID me = ApprovalRequestService.requireEmployee(caller);
        if (date == null) {
            throw invalid(List.of(error("date", "required")));
        }
        Optional<DayOf> day = daily.dayOf(me, date, null);
        boolean inMissing = day.map(d -> d.day().in() == null).orElse(false);
        boolean outMissing = day.map(d -> d.day().out() == null).orElse(false);
        List<String> problems = problems(me, date, day.orElse(null), null);
        return new AttendanceAdjustmentCheck(date, day.map(DayOf::day).orElse(null),
                day.map(DayOf::shift).orElse(null), inMissing, outMissing, problems, preview(me));
    }

    /** Sends the caller's request for approval; refused with field errors or the day's first problem. */
    @Transactional
    public AttendanceAdjustmentResponse submit(CurrentAccount caller, AttendanceAdjustmentPayload payload) {
        UUID me = ApprovalRequestService.requireEmployee(caller);
        employees.lockWorkFacts(me).orElseThrow(AttendanceAdjustmentService::noEmployee);
        Draft draft = draft(me, payload, null);
        UUID id = approvals.submit(me, ApprovalRequestType.ATTENDANCE_ADJUSTMENT, null, summary(draft));
        AttendanceAdjustment request = requests.save(new AttendanceAdjustment(id, me, draft.date(), draft.in(),
                draft.out(), draft.reason(), clock.instant()));
        return detail(caller, me, request);
    }

    /** The caller's requests, latest first. */
    @Transactional(readOnly = true)
    public PageResponse<AttendanceAdjustmentListItem> mine(CurrentAccount caller, int page, int size) {
        UUID me = ApprovalRequestService.requireEmployee(caller);
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            String field = page < 0 ? "page" : "size";
            throw invalid(List.of(error(field, "out_of_range")));
        }
        ZoneId zone = PunchImportService.COMPANY_ZONE;
        return PageResponse.of(requests.findByEmployeeIdOrderByCreatedAtDesc(me, PageRequest.of(page, size)),
                request -> new AttendanceAdjustmentListItem(request.getId(), request.getStatus(),
                        request.getWorkDate(), offset(request.getTimeIn(), zone), offset(request.getTimeOut(), zone),
                        request.getStatus().open(), request.getCreatedAt()));
    }

    @Transactional(readOnly = true)
    public AttendanceAdjustmentResponse get(CurrentAccount caller, UUID id) {
        UUID me = ApprovalRequestService.requireEmployee(caller);
        return detail(caller, me, find(id));
    }

    /** Sửa và gửi lại: new times and reason for a request returned to its sender, sent again at the same level. */
    @Transactional
    public AttendanceAdjustmentResponse resubmit(CurrentAccount caller, UUID id, AttendanceAdjustmentPayload payload) {
        UUID me = ApprovalRequestService.requireEmployee(caller);
        AttendanceAdjustment request = find(id);
        requireSender(caller, me, request);
        if (request.getStatus() != AttendanceAdjustmentStatus.RETURNED) {
            throw new ApiException(HttpStatus.CONFLICT, "attendance_adjustment.not_returned",
                    "Only a request returned to its sender can be changed");
        }
        if (payload != null && payload.date() != null && !payload.date().equals(request.getWorkDate())) {
            throw invalid(List.of(error("date", "unchangeable")));
        }
        Draft draft = draft(me, payload == null ? null
                : new AttendanceAdjustmentPayload(request.getWorkDate(), payload.in(), payload.out(), payload.reason()),
                request.getId());
        request.replace(draft.in(), draft.out(), draft.reason(), clock.instant());
        approvals.resubmit(caller, id, null, summary(draft));
        return detail(caller, me, request);
    }

    /** Hủy đơn by its sender while it waits or is returned. An approved request stays: the timekeeper corrects it. */
    @Transactional
    public AttendanceAdjustmentResponse cancel(CurrentAccount caller, UUID id) {
        UUID me = ApprovalRequestService.requireEmployee(caller);
        AttendanceAdjustment request = find(id);
        requireSender(caller, me, request);
        if (!request.getStatus().open()) {
            throw new ApiException(HttpStatus.CONFLICT, "attendance_adjustment.already_closed",
                    "The request is already approved, rejected or cancelled");
        }
        approvals.cancel(caller, id);
        return detail(caller, me, request);
    }

    /** The request follows its Yêu cầu phê duyệt, in the same transaction. */
    @EventListener
    void onApprovalEvent(ApprovalEvent event) {
        if (event.requestType() != ApprovalRequestType.ATTENDANCE_ADJUSTMENT) {
            return;
        }
        AttendanceAdjustmentStatus next = switch (event.type()) {
            case APPROVED -> AttendanceAdjustmentStatus.APPROVED;
            case REJECTED -> AttendanceAdjustmentStatus.REJECTED;
            case RETURNED -> AttendanceAdjustmentStatus.RETURNED;
            case RESUBMITTED -> AttendanceAdjustmentStatus.PENDING;
            case CANCELLED -> AttendanceAdjustmentStatus.CANCELLED;
            default -> null;
        };
        if (next != null) {
            requests.findById(event.requestId()).ifPresent(request -> request.follow(next, event.at()));
        }
    }

    // ---------------------------------------------------------------------------------------------------- the draft

    /** A checked request: the day and the instants it gives. */
    private record Draft(LocalDate date, Instant in, Instant out, String reason) {
    }

    /**
     * Checks the payload against the day as it is now and places the times on the right calendar day.
     *
     * @param replacing the request being sent again, which does not count as an open request for its day
     */
    private Draft draft(UUID me, AttendanceAdjustmentPayload payload, UUID replacing) {
        List<Map<String, String>> errors = new ArrayList<>();
        if (payload == null || payload.date() == null) {
            throw invalid(List.of(error("date", "required")));
        }
        String reason = payload.reason() == null ? "" : payload.reason().trim();
        if (reason.isEmpty()) {
            errors.add(error("reason", "required"));
        } else if (reason.length() > MAX_REASON) {
            errors.add(error("reason", "too_long"));
        }
        if (payload.in() == null && payload.out() == null) {
            errors.add(error("in", "required"));
        }
        LocalDate date = payload.date();
        Optional<DayOf> found = daily.dayOf(me, date, null);
        List<String> problems = problems(me, date, found.orElse(null), replacing);
        if (!problems.isEmpty()) {
            errors.add(error("date", problems.get(0)));
            throw invalid(errors);
        }
        DayOf day = found.orElseThrow();
        if (payload.in() != null && day.day().in() != null) {
            errors.add(error("in", "not_missing"));
        }
        if (payload.out() != null && day.day().out() != null) {
            errors.add(error("out", "not_missing"));
        }
        throwIfAny(errors);

        ZoneId zone = PunchImportService.COMPANY_ZONE;
        Instant in = place(date, payload.in(), day.pattern(), zone);
        Instant out = place(date, payload.out(), day.pattern(), zone);
        Instant resultIn = in != null ? in : instant(day.day().in());
        Instant resultOut = out != null ? out : instant(day.day().out());
        if (resultIn != null && resultOut != null && !resultOut.isAfter(resultIn)) {
            errors.add(error(out != null ? "out" : "in", "out_before_in"));
        }
        if (in != null && in.isAfter(clock.instant()) || out != null && out.isAfter(clock.instant())) {
            errors.add(error(out != null && out.isAfter(clock.instant()) ? "out" : "in", "future"));
        }
        throwIfAny(errors);
        return new Draft(date, in, out, reason);
    }

    /**
     * What stops any request for the day, in the order the form explains them: no shift, a day after today or more
     * than 30 days back, a day with Công thủ công, an open request for the day, nothing missing.
     */
    private List<String> problems(UUID me, LocalDate date, DayOf day, UUID replacing) {
        List<String> problems = new ArrayList<>();
        LocalDate today = clock.instant().atZone(PunchImportService.COMPANY_ZONE).toLocalDate();
        if (date.isAfter(today)) {
            problems.add("future");
        } else if (ChronoUnit.DAYS.between(date, today) > MAX_DAYS_BACK) {
            problems.add("too_old");
        }
        if (day == null || day.shift() == null) {
            problems.add("no_shift");
            return problems;
        }
        if (day.manual()) {
            problems.add("manual_entry");
        }
        boolean open = requests.findByEmployeeIdAndWorkDateAndStatusIn(me, date,
                EnumSet.of(AttendanceAdjustmentStatus.PENDING, AttendanceAdjustmentStatus.RETURNED)).stream()
                .anyMatch(other -> !other.getId().equals(replacing));
        if (open) {
            problems.add("already_open");
        }
        if (!day.manual() && day.day().in() != null && day.day().out() != null) {
            problems.add("nothing_missing");
        }
        return problems;
    }

    /**
     * The instant of a time given for the day: on the day itself, or on the next calendar day for a shift that crosses
     * midnight when the time is before the shift's start.
     */
    static Instant place(LocalDate date, LocalTime time, ShiftPattern shift, ZoneId zone) {
        if (time == null) {
            return null;
        }
        boolean nextDay = shift != null && shift.crossesMidnight() && time.isBefore(shift.startTime());
        return (nextDay ? date.plusDays(1) : date).atTime(time.withSecond(0).withNano(0)).atZone(zone).toInstant();
    }

    static String summary(Draft draft) {
        ZoneId zone = PunchImportService.COMPANY_ZONE;
        List<String> parts = new ArrayList<>();
        if (draft.in() != null) {
            parts.add("vào " + TIME.format(draft.in().atZone(zone)));
        }
        if (draft.out() != null) {
            parts.add("ra " + TIME.format(draft.out().atZone(zone)));
        }
        return "Bổ sung công " + DAY.format(draft.date()) + ": " + String.join(", ", parts);
    }

    // --------------------------------------------------------------------------------------------------- the detail

    private AttendanceAdjustmentResponse detail(CurrentAccount caller, UUID me, AttendanceAdjustment request) {
        boolean sender = me.equals(request.getEmployeeId());
        ApprovalRequestResponse approval = approvals.findForCaller(caller, request.getId()).orElse(null);
        if (approval == null && !sender) {
            throw notFound();
        }
        Optional<DayOf> now = daily.dayOf(request.getEmployeeId(), request.getWorkDate(), null);
        Optional<DayOf> after = daily.dayOf(request.getEmployeeId(), request.getWorkDate(), request);
        EmployeeCard card = employees.cards(List.of(request.getEmployeeId())).get(request.getEmployeeId());
        ZoneId zone = PunchImportService.COMPANY_ZONE;
        return new AttendanceAdjustmentResponse(request.getId(), request.getStatus(), card, request.getWorkDate(),
                now.map(DayOf::shift).orElse(null), offset(request.getTimeIn(), zone),
                offset(request.getTimeOut(), zone), request.getReason(), now.map(DayOf::day).orElse(null),
                after.map(DayOf::day).orElse(null), approval,
                sender && request.getStatus() == AttendanceAdjustmentStatus.RETURNED,
                sender && request.getStatus().open(), request.getCreatedAt(), request.getUpdatedAt());
    }

    private LeaveApproversPreview preview(UUID me) {
        ApprovalRequestService.Preview preview = approvals.preview(me, ApprovalRequestType.ATTENDANCE_ADJUSTMENT);
        Map<UUID, EmployeeCard> cards = employees.cards(preview.firstLevel());
        List<EmployeeCard> first = preview.firstLevel().stream().map(cards::get).filter(Objects::nonNull)
                .sorted(Comparator.comparing(EmployeeCard::fullName)).toList();
        return new LeaveApproversPreview(preview.levelCount(), first, preview.autoApproveDays());
    }

    private void requireSender(CurrentAccount caller, UUID me, AttendanceAdjustment request) {
        if (!me.equals(request.getEmployeeId())) {
            if (approvals.findForCaller(caller, request.getId()).isPresent()) {
                throw new ApiException(HttpStatus.FORBIDDEN, "attendance_adjustment.not_sender",
                        "Only the sender can change this request");
            }
            throw notFound();
        }
    }

    private AttendanceAdjustment find(UUID id) {
        return requests.findById(id).orElseThrow(AttendanceAdjustmentService::notFound);
    }

    private static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "attendance_adjustment.not_found",
                "No such attendance adjustment request");
    }

    private static ApiException noEmployee() {
        return new ApiException(HttpStatus.FORBIDDEN, "approval.no_employee",
                "Only an Account linked to an Employee sends attendance adjustment requests");
    }

    private static Instant instant(OffsetDateTime value) {
        return value == null ? null : value.toInstant();
    }

    private static OffsetDateTime offset(Instant instant, ZoneId zone) {
        return instant == null ? null : instant.atZone(zone).toOffsetDateTime();
    }

    private static Map<String, String> error(String field, String code) {
        return Map.of("field", field, "code", code);
    }

    private static void throwIfAny(List<Map<String, String>> errors) {
        if (!errors.isEmpty()) {
            throw invalid(errors);
        }
    }

    private static ApiException invalid(List<Map<String, String>> errors) {
        return new ApiException(HttpStatus.BAD_REQUEST, "validation.invalid", "Request values are invalid")
                .with("errors", errors);
    }
}
