package com.hrmdemo.service.attendance;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

import com.hrmdemo.entity.shift.RoundingMode;
import com.hrmdemo.entity.shift.ShiftPattern;

/**
 * Bộ xử lý chấm công: turns one Employee's raw Lần quẹt into one {@link DailyRecord} per day that has a Ca làm việc.
 *
 * <p>Pure and deterministic: no clock, no repository, no Spring. The caller loads the inputs and decides the range.
 * Pass the punches from one day before the first day to two days after the last (a night shift reads the next
 * calendar day), and the shifts of one day before the first day too, so that the Out of a night shift that started the
 * day before the range is not lost; only days from {@code from} to {@code to} are returned.
 *
 * <p>Rules:
 * <ul>
 * <li><b>Khung ca</b>: the window of a day's shift runs from {@code marginBefore} before its start to
 * {@code marginAfter} after its end. A shift that crosses midnight belongs to the day it starts. A punch in two windows
 * goes to the shift it is nearest to (the earlier day on a tie), so it is never used twice.</li>
 * <li>Punches closer than {@code minGap} to the previous kept punch are {@code DUPLICATE_PUNCH}: noted, not counted.
 * The first kept punch is the In and the last the Out. A single punch is the In when it is nearer the start of the shift
 * than its end, else the Out; the other one is missing. It is never guessed.</li>
 * <li>Times are compared to the minute (seconds are dropped). Late: the In is after start plus the late tolerance, and
 * the late minutes then run from the start. Early leave: the Out is before end minus the early tolerance, and the early
 * minutes run to the end.</li>
 * <li>Worked minutes: from the later of In and start to the earlier of Out and end, minus the break, then rounded by the
 * shift's rounding mode and never above the scheduled minutes. Time outside the shift is not worked time here (OT is
 * HRM-25). Zero when In or Out is missing.</li>
 * <li>A day with a shift, no punch, no leave and no holiday is {@code ABSENT}. On a holiday or a leave day nothing is
 * judged (no absent, missing, late or early); punches are still paired and worked minutes computed. A half-day leave
 * judges nothing either, because the shift no longer says when the person should be there.</li>
 * <li><b>Công thủ công</b> (HRM-24): a day with one is computed from it alone. Its punches stay on the record as
 * {@code NOT_USED} and are never counted, so a manual entry and the machine log are never added together. Đủ công is the
 * scheduled minutes and Nửa công half of them, with nothing judged; Vắng is absent; In and Out times are judged and
 * worked out like a pair of punches.</li>
 * <li><b>Đơn bổ sung công</b> (HRM-24), approved: its times fill only a side the punches left missing; a punched side
 * is never replaced. Missing-punch and absent flags then follow the filled In and Out, and late, early leave and worked
 * minutes are computed from them.</li>
 * </ul>
 * OT is not an input yet (HRM-25).
 */
public final class AttendanceProcessor {

    /** What is wrong with, or special about, a day. {@code LATE} and {@code EARLY_LEAVE} are the minutes on the record. */
    public enum Flag {
        MISSING_IN, MISSING_OUT, ABSENT, DUPLICATE_PUNCH, LEAVE, HOLIDAY
    }

    /** How much of the day an approved leave covers. */
    public enum LeavePart {
        WHOLE, MORNING, AFTERNOON
    }

    /**
     * How a punch was used. {@code MIDDLE}: inside the pair, between In and Out. {@code OUTSIDE}: in no Khung ca.
     * {@code NOT_USED}: on a day with Công thủ công, which replaces the punches.
     */
    public enum Role {
        IN, OUT, DUPLICATE, MIDDLE, OUTSIDE, NOT_USED
    }

    /** Where the In or the Out of a day comes from. */
    public enum Source {
        PUNCH, MANUAL, ADJUSTMENT
    }

    /** The kinds of Công thủ công: Đủ công, Nửa công, Vắng, or an In and an Out time. */
    public enum ManualKind {
        FULL, HALF, ABSENT, TIMES
    }

    /**
     * The Công thủ công of one day. {@code in} and {@code out} are set for {@link ManualKind#TIMES} only (the Out on the
     * next calendar day for a shift that crosses midnight).
     */
    public record ManualDay(ManualKind kind, Instant in, Instant out) {
        public ManualDay {
            boolean times = kind == ManualKind.TIMES;
            if (times ? in == null || out == null : in != null || out != null) {
                throw new IllegalArgumentException("In and Out are given for TIMES, and only for TIMES");
            }
            if (times && !out.isAfter(in)) {
                throw new IllegalArgumentException("Out must be after In");
            }
        }

        public static ManualDay of(ManualKind kind) {
            return new ManualDay(kind, null, null);
        }

        public static ManualDay times(Instant in, Instant out) {
            return new ManualDay(ManualKind.TIMES, in, out);
        }
    }

    /** The times of an approved Đơn bổ sung công for one day; either may be null. */
    public record Adjustment(Instant in, Instant out) {
    }

    /** The Công thủ công and approved Đơn bổ sung công of one Employee, by day. */
    public record Corrections(Map<LocalDate, ManualDay> manual, Map<LocalDate, Adjustment> adjustments) {
        public static final Corrections NONE = new Corrections(Map.of(), Map.of());
    }

    public record PunchUse(Instant at, Role role) {
    }

    /**
     * @param in the first punch of the window, null when missing
     * @param out the last punch of the window, null when missing
     * @param punches every punch of the window with its role, in time order
     * @param inSource where {@code in} comes from, null when there is no In
     * @param outSource where {@code out} comes from, null when there is no Out
     * @param manual the kind of Công thủ công of the day, null when it has none
     */
    public record DailyRecord(LocalDate date, ShiftPattern shift, Instant in, Instant out, int workedMinutes,
            int lateMinutes, int earlyLeaveMinutes, Set<Flag> flags, String holidayName, LeavePart leave,
            List<PunchUse> punches, Source inSource, Source outSource, ManualKind manual) {
    }

    /** @param unassigned punches that fall in no Khung ca, as {@link Role#OUTSIDE} (a day without a shift, say) */
    public record Result(List<DailyRecord> days, List<PunchUse> unassigned) {
    }

    /** The window margins around a shift and the smallest gap between two punches that count as two. */
    public record Rules(Duration marginBefore, Duration marginAfter, Duration minGap) {
        public static final Rules DEFAULT = new Rules(Duration.ofHours(3), Duration.ofHours(3), Duration.ofMinutes(3));
    }

    private final Rules rules;
    private final ZoneId zone;

    public AttendanceProcessor(Rules rules, ZoneId zone) {
        this.rules = rules;
        this.zone = zone;
    }

    /**
     * @param punches the Employee's punches, any order
     * @param shiftByDay the shift of each day (see EffectiveShifts), days without a shift absent
     * @param holidays holiday names by day
     * @param leave approved leave by day
     */
    public Result process(List<Instant> punches, LocalDate from, LocalDate to, Map<LocalDate, ShiftPattern> shiftByDay,
            Map<LocalDate, String> holidays, Map<LocalDate, LeavePart> leave) {
        return process(punches, from, to, shiftByDay, holidays, leave, Corrections.NONE);
    }

    /** As {@link #process(List, LocalDate, LocalDate, Map, Map, Map)}, with the day's Công thủ công and approved
     * Đơn bổ sung công. */
    public Result process(List<Instant> punches, LocalDate from, LocalDate to, Map<LocalDate, ShiftPattern> shiftByDay,
            Map<LocalDate, String> holidays, Map<LocalDate, LeavePart> leave, Corrections corrections) {
        List<Instant> sorted = punches.stream().sorted().distinct().toList();
        Map<LocalDate, List<Instant>> byShiftDay = new TreeMap<>();
        List<PunchUse> unassigned = new ArrayList<>();
        for (Instant punch : sorted) {
            LocalDate shiftDay = assign(punch, shiftByDay);
            if (shiftDay == null) {
                if (inRange(punch, from, to)) {
                    unassigned.add(new PunchUse(punch, Role.OUTSIDE));
                }
            } else {
                byShiftDay.computeIfAbsent(shiftDay, d -> new ArrayList<>()).add(punch);
            }
        }
        List<DailyRecord> days = new ArrayList<>();
        for (LocalDate day = from; !day.isAfter(to); day = day.plusDays(1)) {
            ShiftPattern shift = shiftByDay.get(day);
            if (shift != null) {
                days.add(dayRecord(day, shift, byShiftDay.getOrDefault(day, List.of()), holidays.get(day),
                        leave.get(day), corrections.manual().get(day), corrections.adjustments().get(day)));
            }
        }
        return new Result(days, unassigned);
    }

    private boolean inRange(Instant punch, LocalDate from, LocalDate to) {
        LocalDate date = punch.atZone(zone).toLocalDate();
        return !date.isBefore(from) && !date.isAfter(to);
    }

    /** The shift day whose Khung ca holds the punch and whose shift is nearest to it; null when none. */
    private LocalDate assign(Instant punch, Map<LocalDate, ShiftPattern> shiftByDay) {
        LocalDate local = punch.atZone(zone).toLocalDate();
        LocalDate best = null;
        long bestDistance = Long.MAX_VALUE;
        for (LocalDate day = local.minusDays(1); !day.isAfter(local.plusDays(1)); day = day.plusDays(1)) {
            ShiftPattern shift = shiftByDay.get(day);
            if (shift == null) {
                continue;
            }
            Instant start = startOf(day, shift);
            Instant end = endOf(day, shift);
            if (punch.isBefore(start.minus(rules.marginBefore())) || punch.isAfter(end.plus(rules.marginAfter()))) {
                continue;
            }
            long distance = punch.isBefore(start) ? Duration.between(punch, start).toSeconds()
                    : punch.isAfter(end) ? Duration.between(end, punch).toSeconds() : 0;
            if (distance < bestDistance) {
                best = day;
                bestDistance = distance;
            }
        }
        return best;
    }

    private DailyRecord dayRecord(LocalDate day, ShiftPattern shift, List<Instant> windowPunches, String holidayName,
            LeavePart leavePart, ManualDay manual, Adjustment adjustment) {
        Instant start = startOf(day, shift);
        Instant end = endOf(day, shift);
        Set<Flag> flags = EnumSet.noneOf(Flag.class);
        if (holidayName != null) {
            flags.add(Flag.HOLIDAY);
        }
        if (leavePart != null) {
            flags.add(Flag.LEAVE);
        }
        boolean judged = holidayName == null && leavePart == null;
        if (manual != null) {
            return manualRecord(day, shift, windowPunches, holidayName, leavePart, manual, flags, judged, start, end);
        }

        List<Instant> kept = new ArrayList<>();
        List<Instant> duplicates = new ArrayList<>();
        for (Instant punch : windowPunches) {
            if (!kept.isEmpty() && Duration.between(kept.get(kept.size() - 1), punch).compareTo(rules.minGap()) < 0) {
                duplicates.add(punch);
            } else {
                kept.add(punch);
            }
        }
        if (!duplicates.isEmpty()) {
            flags.add(Flag.DUPLICATE_PUNCH);
        }

        Instant in = null;
        Instant out = null;
        if (kept.size() >= 2) {
            in = kept.get(0);
            out = kept.get(kept.size() - 1);
        } else if (kept.size() == 1) {
            Instant only = kept.get(0);
            if (Duration.between(start, only).abs().compareTo(Duration.between(only, end).abs()) <= 0) {
                in = only;
            } else {
                out = only;
            }
        }

        Source inSource = in == null ? null : Source.PUNCH;
        Source outSource = out == null ? null : Source.PUNCH;
        if (adjustment != null && in == null && adjustment.in() != null) {
            in = adjustment.in();
            inSource = Source.ADJUSTMENT;
        }
        if (adjustment != null && out == null && adjustment.out() != null) {
            out = adjustment.out();
            outSource = Source.ADJUSTMENT;
        }

        if (in == null && out == null) {
            if (judged) {
                flags.add(Flag.ABSENT);
            }
        } else if (judged) {
            if (in == null) {
                flags.add(Flag.MISSING_IN);
            }
            if (out == null) {
                flags.add(Flag.MISSING_OUT);
            }
        }

        int late = judged ? lateMinutes(shift, start, in) : 0;
        int early = judged ? earlyMinutes(shift, end, out) : 0;
        int worked = in != null && out != null ? workedMinutes(shift, start, end, in, out) : 0;

        List<PunchUse> uses = new ArrayList<>();
        for (Instant punch : windowPunches) {
            Role role = duplicates.contains(punch) ? Role.DUPLICATE
                    : punch.equals(in) && inSource == Source.PUNCH ? Role.IN
                    : punch.equals(out) && outSource == Source.PUNCH ? Role.OUT : Role.MIDDLE;
            uses.add(new PunchUse(punch, role));
        }
        uses.sort(Comparator.comparing(PunchUse::at));
        return new DailyRecord(day, shift, in, out, worked, late, early, flags, holidayName, leavePart, uses, inSource,
                outSource, null);
    }

    /** A day with Công thủ công: the entry alone decides; the punches are listed as not used. */
    private DailyRecord manualRecord(LocalDate day, ShiftPattern shift, List<Instant> windowPunches,
            String holidayName, LeavePart leavePart, ManualDay manual, Set<Flag> flags, boolean judged, Instant start,
            Instant end) {
        Instant in = null;
        Instant out = null;
        int worked = 0;
        int late = 0;
        int early = 0;
        switch (manual.kind()) {
            case FULL -> worked = shift.scheduledMinutes();
            case HALF -> worked = shift.scheduledMinutes() / 2;
            case ABSENT -> {
                if (judged) {
                    flags.add(Flag.ABSENT);
                }
            }
            case TIMES -> {
                in = manual.in();
                out = manual.out();
                late = judged ? lateMinutes(shift, start, in) : 0;
                early = judged ? earlyMinutes(shift, end, out) : 0;
                worked = workedMinutes(shift, start, end, in, out);
            }
        }
        List<PunchUse> uses = windowPunches.stream().map(punch -> new PunchUse(punch, Role.NOT_USED)).toList();
        Source source = in == null ? null : Source.MANUAL;
        return new DailyRecord(day, shift, in, out, worked, late, early, flags, holidayName, leavePart, uses, source,
                source, manual.kind());
    }

    /** Minutes late from the start, 0 within the tolerance or without an In. */
    private static int lateMinutes(ShiftPattern shift, Instant start, Instant in) {
        if (in == null) {
            return 0;
        }
        long after = minutesBetween(start, in);
        return after > shift.lateToleranceMinutes() ? (int) after : 0;
    }

    /** Minutes left early before the end, 0 within the tolerance or without an Out. */
    private static int earlyMinutes(ShiftPattern shift, Instant end, Instant out) {
        if (out == null) {
            return 0;
        }
        long before = minutesBetween(out, end);
        return before > shift.earlyToleranceMinutes() ? (int) before : 0;
    }

    /** In to Out inside the shift, less the break, rounded; never above the scheduled minutes. */
    private int workedMinutes(ShiftPattern shift, Instant start, Instant end, Instant in, Instant out) {
        Instant from = latest(in.truncatedTo(ChronoUnit.MINUTES), start);
        Instant to = earliest(out.truncatedTo(ChronoUnit.MINUTES), end);
        long worked = Math.max(0, minutesBetween(from, to));
        if (shift.breakStart() != null && shift.breakEnd() != null) {
            Instant breakFrom = start.plus(Duration.ofMinutes(shift.breakStartOffset()));
            Instant breakTo = start.plus(Duration.ofMinutes(shift.breakEndOffset()));
            Instant overlapFrom = latest(from, breakFrom);
            Instant overlapTo = earliest(to, breakTo);
            if (overlapTo.isAfter(overlapFrom)) {
                worked -= minutesBetween(overlapFrom, overlapTo);
            }
        }
        return (int) Math.min(round(worked, shift.roundingMode(), shift.roundingMinutes()), shift.scheduledMinutes());
    }

    static long round(long minutes, RoundingMode mode, Integer step) {
        if (mode == null || mode == RoundingMode.NONE || step == null || step <= 1) {
            return minutes;
        }
        return switch (mode) {
            case DOWN -> Math.floorDiv(minutes, step) * step;
            case UP -> Math.ceilDiv(minutes, step) * step;
            case NEAREST -> Math.floorDiv(minutes + step / 2, step) * step;
            case NONE -> minutes;
        };
    }

    /** Whole minutes from a to b, both read to the minute; negative when b is before a. */
    private static long minutesBetween(Instant a, Instant b) {
        return ChronoUnit.MINUTES.between(a.truncatedTo(ChronoUnit.MINUTES), b.truncatedTo(ChronoUnit.MINUTES));
    }

    private Instant startOf(LocalDate day, ShiftPattern shift) {
        return day.atTime(shift.startTime()).atZone(zone).toInstant();
    }

    private Instant endOf(LocalDate day, ShiftPattern shift) {
        return startOf(day, shift).plus(Duration.ofMinutes(shift.lengthMinutes()));
    }

    private static Instant latest(Instant a, Instant b) {
        return a.isAfter(b) ? a : b;
    }

    private static Instant earliest(Instant a, Instant b) {
        return a.isBefore(b) ? a : b;
    }
}
