package com.hrmdemo.service.leave;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Period;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.UUID;

import com.hrmdemo.dto.leave.DayPart;
import com.hrmdemo.dto.leave.LeaveAccrual;
import com.hrmdemo.dto.leave.LeaveBalance;
import com.hrmdemo.dto.leave.LeaveCarryOver;
import com.hrmdemo.dto.leave.LeaveDay;
import com.hrmdemo.dto.leave.LeaveDayKind;
import com.hrmdemo.dto.leave.LeaveProblem;
import com.hrmdemo.dto.workschedule.WorkDayKind;
import com.hrmdemo.service.workschedule.WorkWeek;

/**
 * Chính sách phép, the deep module of leave (PRD, module 3): pure functions over the policy versions of a Loại nghỉ,
 * the hire date, the Lịch làm việc, the holidays and the days the Employee's other requests already hold. No
 * database, no clock: every input is a parameter, so the rules are unit tested by business case.
 * <ul>
 * <li>A day counts 1 when it is a whole working day, 0.5 for a half (a requested half, or a working morning only),
 * 0 on a day off of the Lịch làm việc or a holiday. Half a day is the smallest unit.</li>
 * <li>Phép năm accrues 1/12 of the yearly entitlement at the start of each month worked; a hire after the cut-off day
 * starts with the next month. The entitlement grows by one day per step of full years of service, from the month
 * the step is reached. A yearly grant gives the whole year (prorated in the year of hire) at once.</li>
 * <li>Còn lại is accrued minus Đã dùng minus Đang chờ. With Ứng trước phép a request may go up to the whole year's
 * entitlement, so Còn lại can be negative.</li>
 * </ul>
 * Days are attributed to the year they fall in: a request across New Year takes from both years' balances.
 * Phép tồn (carry-over, {@link CarryOverRules}) is derived the same way: last year's unused days up to the policy's
 * maximum, taken first by the days up to its expiry, lost after it.
 */
public final class LeavePolicyEngine {

    /** The longest request, first to last day: Thai sản is about six months. */
    public static final int MAX_SPAN_DAYS = 366;

    static final BigDecimal HALF = new BigDecimal("0.5");
    private static final BigDecimal TWELVE = BigDecimal.valueOf(12);
    private static final int SCALE = 2;

    private LeavePolicyEngine() {
    }

    /** What a limited type gives in a year: accrued to a day, and the whole year. Days, two decimals. */
    public record Entitlement(BigDecimal accrued, BigDecimal entitled) {
    }

    /**
     * A request being checked.
     *
     * @param attachments how many files come with it
     * @param replacing   the request it replaces when the sender edits a returned one: its days do not count as
     *                    held; null for a new request
     */
    public record LeaveDraft(UUID leaveTypeId, LeaveSpan span, int attachments, UUID replacing) {
    }

    /**
     * What the check needs to know about the Employee and the company.
     *
     * @param today    the company's today: the balance is accrued to it
     * @param history  the policy versions of the requested type, any order
     * @param holidays the holidays by day, with their names
     * @param booked   the days the Employee's other requests hold, of every type
     */
    public record LeaveContext(LocalDate today, LocalDate hireDate, List<LeaveRule> history, WorkWeek week,
            Map<LocalDate, String> holidays, List<BookedDay> booked) {
    }

    /**
     * The outcome of a check.
     *
     * @param days           every day from the first to the last; empty when the dates themselves are wrong
     * @param balance        the balance of the type in the year of the first day, before this request; null when
     *                       the dates are wrong
     * @param remainingAfter Còn lại after this request (limited types); null otherwise
     */
    public record LeaveCheck(List<LeaveDay> days, BigDecimal total, LeaveBalance balance, BigDecimal remainingAfter,
            List<LeaveProblem> problems) {

        public boolean ok() {
            return problems.isEmpty();
        }
    }

    /** The version in force on a day: the latest that started on or before it; null when none had started. */
    public static LeaveRule ruleOn(Collection<LeaveRule> history, LocalDate day) {
        return history.stream()
                .filter(rule -> !rule.effectiveFrom().isAfter(day))
                .max(Comparator.comparing(LeaveRule::effectiveFrom))
                .orElse(null);
    }

    /** What is wrong with the dates and day parts themselves; empty when the days can be counted. */
    public static List<LeaveProblem> spanProblems(LeaveSpan span, LeaveRule rule) {
        List<LeaveProblem> problems = new ArrayList<>();
        if (span.end().isBefore(span.start())) {
            problems.add(LeaveProblem.of("leave.invalid_dates"));
            return problems;
        }
        if (ChronoUnit.DAYS.between(span.start(), span.end()) >= MAX_SPAN_DAYS) {
            problems.add(new LeaveProblem("leave.range_too_long", Map.of("maxDays", MAX_SPAN_DAYS)));
            return problems;
        }
        boolean oneDay = span.start().equals(span.end());
        if (!oneDay && (span.startPart() == DayPart.MORNING || span.endPart() == DayPart.AFTERNOON)) {
            problems.add(LeaveProblem.of("leave.invalid_part"));
        }
        if (oneDay && span.startPart() != span.endPart()) {
            problems.add(LeaveProblem.of("leave.invalid_part"));
        }
        if (rule != null && !rule.halfDayAllowed()
                && (span.startPart() != DayPart.FULL || span.endPart() != DayPart.FULL)) {
            problems.add(LeaveProblem.of("leave.half_day_not_allowed"));
        }
        return problems;
    }

    /** Every day of the span with what it counts. The span must be valid ({@link #spanProblems}). */
    public static List<LeaveDay> breakdown(LeaveSpan span, WorkWeek week, Map<LocalDate, String> holidays) {
        List<LeaveDay> days = new ArrayList<>();
        boolean oneDay = span.start().equals(span.end());
        for (LocalDate day = span.start(); !day.isAfter(span.end()); day = day.plusDays(1)) {
            DayPart part = oneDay ? span.startPart()
                    : day.equals(span.start()) ? span.startPart()
                    : day.equals(span.end()) ? span.endPart()
                    : DayPart.FULL;
            boolean wantsMorning = part != DayPart.AFTERNOON;
            boolean wantsAfternoon = part != DayPart.MORNING;
            String holiday = holidays.get(day);
            if (holiday != null) {
                days.add(new LeaveDay(day, LeaveDayKind.HOLIDAY, false, false, zero(), holiday));
                continue;
            }
            WorkDayKind scheduled = week.of(day);
            if (scheduled == WorkDayKind.OFF) {
                days.add(new LeaveDay(day, LeaveDayKind.DAY_OFF, false, false, zero(), null));
                continue;
            }
            boolean morning = wantsMorning;
            boolean afternoon = wantsAfternoon && scheduled == WorkDayKind.FULL;
            BigDecimal value = HALF.multiply(BigDecimal.valueOf((morning ? 1 : 0) + (afternoon ? 1 : 0)));
            days.add(new LeaveDay(day, LeaveDayKind.WORKING, morning, afternoon, scaled(value), null));
        }
        return days;
    }

    public static BigDecimal total(Collection<LeaveDay> days) {
        return scaled(days.stream().map(LeaveDay::value).reduce(BigDecimal.ZERO, BigDecimal::add));
    }

    /** Full years of service on a day; 0 before the first anniversary or before the hire. */
    public static int seniorityYears(LocalDate hireDate, LocalDate on) {
        return on.isBefore(hireDate) ? 0 : Period.between(hireDate, on).getYears();
    }

    /** Định mức phép năm on a day: the base plus one day per step of full years of service. */
    public static BigDecimal yearlyEntitlement(LeaveRule rule, LocalDate hireDate, LocalDate on) {
        if (rule == null || !rule.limited() || rule.entitlementDays() == null) {
            return BigDecimal.ZERO;
        }
        Integer step = rule.seniorityStepYears();
        int extra = step == null || step <= 0 ? 0 : seniorityYears(hireDate, on) / step;
        return rule.entitlementDays().add(BigDecimal.valueOf(extra));
    }

    /**
     * What a limited type gives in a year: accrued to {@code asOf}, and the whole year. Every month earns 1/12 of the
     * yearly entitlement in force on its first day; the months before the hire (or the hire month after the cut-off
     * day) earn nothing. A monthly accrual earns a month on its first day; a yearly grant gives the whole year on
     * 1 January, nothing for a year that has not begun.
     */
    public static Entitlement entitlement(List<LeaveRule> history, LocalDate hireDate, int year, LocalDate asOf) {
        int first = firstEarningMonth(history, hireDate, year);
        BigDecimal wholeYear = BigDecimal.ZERO;
        BigDecimal toDate = BigDecimal.ZERO;
        int lastToDate = asOf.getYear() < year ? 0 : asOf.getYear() > year ? 12 : asOf.getMonthValue();
        for (int month = first; month <= 12; month++) {
            LocalDate start = LocalDate.of(year, month, 1);
            BigDecimal monthly = yearlyEntitlement(ruleOn(history, start), hireDate, start);
            wholeYear = wholeYear.add(monthly);
            if (month <= lastToDate) {
                toDate = toDate.add(monthly);
            }
        }
        BigDecimal entitled = wholeYear.divide(TWELVE, SCALE, RoundingMode.HALF_UP);
        LeaveRule rule = ruleOn(history, clamp(asOf, year));
        boolean yearly = rule != null && rule.accrual() == LeaveAccrual.YEARLY;
        BigDecimal accrued = yearly ? (asOf.getYear() < year ? zero() : entitled)
                : toDate.divide(TWELVE, SCALE, RoundingMode.HALF_UP);
        return new Entitlement(accrued, entitled);
    }

    /**
     * Số dư phép of a type in a year as of a day, from the days the Employee's requests hold. A type that is not
     * limited (in the version in force that year) reports only used and pending.
     */
    public static LeaveBalance balance(UUID leaveTypeId, List<LeaveRule> history, LocalDate hireDate, int year,
            LocalDate asOf, Collection<BookedDay> booked) {
        BigDecimal used = zero();
        BigDecimal pending = zero();
        for (BookedDay day : booked) {
            if (day.leaveTypeId().equals(leaveTypeId) && day.date().getYear() == year) {
                if (day.approved()) {
                    used = used.add(day.value());
                } else {
                    pending = pending.add(day.value());
                }
            }
        }
        used = scaled(used);
        pending = scaled(pending);
        LeaveRule rule = ruleOn(history, clamp(asOf, year));
        if (rule == null || !rule.limited()) {
            return new LeaveBalance(leaveTypeId, year, false, null, null, used, pending, null, zero(), null, null);
        }
        Entitlement entitlement = entitlement(history, hireDate, year, asOf);
        CarryOverRules.Grant grant = CarryOverRules.grant(leaveTypeId, history, hireDate, year, asOf, booked);
        LeaveCarryOver carryOver = grant == null ? null : CarryOverRules.report(leaveTypeId, grant, booked, year, asOf);
        // What the days taken can draw on besides the year's own: Phép tồn that has not expired, and what it covered.
        BigDecimal carry = carryOver == null ? zero() : carryOver.used().add(carryOver.remaining());
        BigDecimal remaining = entitlement.accrued().add(carry).subtract(used).subtract(pending);
        BigDecimal ceiling = rule.advanceAllowed() ? entitlement.entitled().max(entitlement.accrued())
                : entitlement.accrued();
        BigDecimal available = ceiling.add(carry).subtract(used).subtract(pending);
        BigDecimal advance = available.subtract(remaining.max(BigDecimal.ZERO)).max(BigDecimal.ZERO);
        return new LeaveBalance(leaveTypeId, year, true, entitlement.accrued(), entitlement.entitled(), used, pending,
                scaled(remaining), scaled(advance), scaled(available), carryOver);
    }

    /**
     * Checks a request: the dates and day parts, the days it counts, the hire date, the type's own limits, the
     * other requests of the Employee, and the balance of each year it touches. Problems are listed in that order;
     * the dates come first because nothing else can be counted without them.
     */
    public static LeaveCheck check(LeaveDraft draft, LeaveContext context) {
        LeaveSpan span = draft.span();
        LeaveRule rule = ruleOn(context.history(), span.start());
        List<LeaveProblem> problems = new ArrayList<>(spanProblems(span, rule));
        if (rule == null && problems.isEmpty()) {
            problems.add(LeaveProblem.of("leave.no_policy"));
        }
        if (problems.stream().anyMatch(p -> !p.code().equals("leave.half_day_not_allowed")
                && !p.code().equals("leave.no_policy"))) {
            return new LeaveCheck(List.of(), zero(), null, null, problems);
        }
        List<LeaveDay> days = breakdown(span, context.week(), context.holidays());
        BigDecimal total = total(days);
        List<BookedDay> others = context.booked().stream()
                .filter(day -> draft.replacing() == null || !draft.replacing().equals(day.requestId()))
                .toList();

        if (span.start().isBefore(context.hireDate())) {
            problems.add(new LeaveProblem("leave.before_hire", Map.of("hireDate", context.hireDate().toString())));
        }
        if (total.signum() == 0) {
            problems.add(LeaveProblem.of("leave.no_working_day"));
        }
        if (rule != null && rule.maxDaysPerRequest() != null && total.compareTo(rule.maxDaysPerRequest()) > 0) {
            problems.add(new LeaveProblem("leave.over_max_per_request", Map.of("max", rule.maxDaysPerRequest())));
        }
        if (rule != null && rule.attachmentRequired() && draft.attachments() == 0) {
            problems.add(LeaveProblem.of("leave.attachment_required"));
        }
        List<String> overlapping = overlap(days, others);
        if (!overlapping.isEmpty()) {
            problems.add(new LeaveProblem("leave.overlap", Map.of("dates", overlapping)));
        }

        LeaveBalance balance = balance(draft.leaveTypeId(), context.history(), context.hireDate(),
                span.start().getYear(), context.today(), others);
        BigDecimal remainingAfter = null;
        if (balance.limited()) {
            remainingAfter = scaled(balance.remaining().subtract(daysIn(days, span.start().getYear())));
        }
        for (Map.Entry<Integer, BigDecimal> year : daysByYear(days).entrySet()) {
            LeaveBalance ofYear = year.getKey() == span.start().getYear() ? balance
                    : balance(draft.leaveTypeId(), context.history(), context.hireDate(), year.getKey(),
                            context.today(), others);
            BigDecimal over = ofYear.limited() ? overBalance(ofYear, year.getValue(), days, year.getKey()) : zero();
            if (over.signum() > 0) {
                Map<String, Object> details = new LinkedHashMap<>();
                details.put("year", year.getKey());
                details.put("requested", year.getValue());
                details.put("remaining", ofYear.remaining());
                details.put("advanceAvailable", ofYear.advanceAvailable());
                details.put("available", ofYear.available());
                details.put("over", over);
                problems.add(new LeaveProblem("leave.over_balance", details));
            }
        }
        return new LeaveCheck(days, total, balance, remainingAfter, problems);
    }

    /**
     * How many of the {@code requested} days of a year the balance cannot cover (zero or less when it can). Days up to
     * the expiry of the year's Phép tồn draw on what is left of it first; the others, and what it cannot cover, need
     * the year's own days (and the advance, when allowed).
     */
    private static BigDecimal overBalance(LeaveBalance balance, BigDecimal requested, List<LeaveDay> days, int year) {
        LeaveCarryOver carry = balance.carryOver();
        if (carry == null) {
            return scaled(requested.subtract(balance.available()));
        }
        BigDecimal early = scaled(days.stream()
                .filter(day -> day.date().getYear() == year && !day.date().isAfter(carry.expiresOn()))
                .map(LeaveDay::value).reduce(BigDecimal.ZERO, BigDecimal::add));
        BigDecimal fromCarry = early.min(carry.granted().subtract(carry.used())).max(BigDecimal.ZERO);
        BigDecimal ownCapacity = balance.available().subtract(carry.remaining());
        return scaled(requested.subtract(fromCarry).subtract(ownCapacity));
    }

    /** The days this request takes that another one already holds, by half day; as ISO dates. */
    private static List<String> overlap(List<LeaveDay> days, List<BookedDay> others) {
        Map<LocalDate, List<BookedDay>> byDay = new TreeMap<>();
        others.forEach(day -> byDay.computeIfAbsent(day.date(), d -> new ArrayList<>()).add(day));
        TreeSet<LocalDate> clashes = new TreeSet<>();
        for (LeaveDay day : days) {
            for (BookedDay held : byDay.getOrDefault(day.date(), List.of())) {
                if ((day.morning() && held.morning()) || (day.afternoon() && held.afternoon())) {
                    clashes.add(day.date());
                }
            }
        }
        return clashes.stream().map(LocalDate::toString).toList();
    }

    private static Map<Integer, BigDecimal> daysByYear(List<LeaveDay> days) {
        Map<Integer, BigDecimal> byYear = new TreeMap<>();
        for (LeaveDay day : days) {
            if (day.value().signum() > 0) {
                byYear.merge(day.date().getYear(), day.value(), BigDecimal::add);
            }
        }
        byYear.replaceAll((year, value) -> scaled(value));
        return byYear;
    }

    private static BigDecimal daysIn(List<LeaveDay> days, int year) {
        return daysByYear(days).getOrDefault(year, zero());
    }

    /**
     * The first month of the year that earns: January, or the hire month (the next one after the cut-off day) in the
     * year of hire; 13 when the year is before the hire.
     */
    private static int firstEarningMonth(List<LeaveRule> history, LocalDate hireDate, int year) {
        if (hireDate.getYear() > year) {
            return 13;
        }
        if (hireDate.getYear() < year) {
            return 1;
        }
        LeaveRule rule = ruleOn(history, hireDate.withDayOfMonth(1));
        int cutOff = rule == null ? 15 : rule.cutOffDay();
        return hireDate.getDayOfMonth() <= cutOff ? hireDate.getMonthValue() : hireDate.getMonthValue() + 1;
    }

    /** The day inside the year that is nearest to {@code day}. */
    private static LocalDate clamp(LocalDate day, int year) {
        LocalDate first = LocalDate.of(year, 1, 1);
        LocalDate last = LocalDate.of(year, 12, 31);
        return day.isBefore(first) ? first : day.isAfter(last) ? last : day;
    }

    private static BigDecimal zero() {
        return BigDecimal.ZERO.setScale(SCALE);
    }

    static BigDecimal scaled(BigDecimal value) {
        return value.setScale(SCALE, RoundingMode.HALF_UP);
    }
}
