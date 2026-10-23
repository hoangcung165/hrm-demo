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
 * </ul>
 * OT and attendance adjustments are not inputs yet (HRM-24, HRM-25).
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

    /** How a punch was used. {@code MIDDLE}: inside the pair, between In and Out. {@code OUTSIDE}: in no Khung ca. */
    public enum Role {
        IN, OUT, DUPLICATE, MIDDLE, OUTSIDE
    }

    public record PunchUse(Instant at, Role role) {
    }

    /**
     * @param in the first punch of the window, null when missing
     * @param out the last punch of the window, null when missing
     * @param punches every punch of the window with its role, in time order
     */
    public record DailyRecord(LocalDate date, ShiftPattern shift, Instant in, Instant out, int workedMinutes,
            int lateMinutes, int earlyLeaveMinutes, Set<Flag> flags, String holidayName, LeavePart leave,
            List<PunchUse> punches) {
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
                        leave.get(day)));
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
            LeavePart leavePart) {
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

        if (kept.isEmpty()) {
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

        int late = 0;
        int early = 0;
        if (judged && in != null) {
            long after = minutesBetween(start, in);
            if (after > shift.lateToleranceMinutes()) {
                late = (int) after;
            }
        }
        if (judged && out != null) {
            long before = minutesBetween(out, end);
            if (before > shift.earlyToleranceMinutes()) {
                early = (int) before;
            }
        }
        int worked = in != null && out != null ? workedMinutes(shift, start, end, in, out) : 0;

        List<PunchUse> uses = new ArrayList<>();
        for (Instant punch : windowPunches) {
            Role role = duplicates.contains(punch) ? Role.DUPLICATE
                    : punch.equals(in) ? Role.IN : punch.equals(out) ? Role.OUT : Role.MIDDLE;
            uses.add(new PunchUse(punch, role));
        }
        uses.sort(Comparator.comparing(PunchUse::at));
        return new DailyRecord(day, shift, in, out, worked, late, early, flags, holidayName, leavePart, uses);
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
