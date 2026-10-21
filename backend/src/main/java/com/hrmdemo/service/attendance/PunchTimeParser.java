package com.hrmdemo.service.attendance;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Reads the time of a punch from the text cells of a file. Times without an offset are wall-clock time of the
 * company's zone; a time with an offset ({@code Z}, {@code +07:00}) is exact. Dates are {@code yyyy-mm-dd},
 * {@code dd/mm/yyyy} or {@code d/m/yyyy}, never {@code mm/dd}. Pure.
 */
final class PunchTimeParser {

    /** Result of reading a row: the instant, or the error code when it cannot be read. */
    record Parsed(Instant instant, String error) {

        static Parsed ok(Instant instant) {
            return new Parsed(instant, null);
        }

        static Parsed error(String code) {
            return new Parsed(null, code);
        }
    }

    static final String MISSING = "time_missing";
    static final String INVALID = "time_invalid";

    private static final List<DateTimeFormatter> DATE_TIME = List.of(
            strict("uuuu-MM-dd H:mm:ss"), strict("uuuu-MM-dd H:mm"),
            strict("uuuu-MM-dd'T'H:mm:ss"), strict("uuuu-MM-dd'T'H:mm"),
            strict("d/M/uuuu H:mm:ss"), strict("d/M/uuuu H:mm"));
    private static final List<DateTimeFormatter> DATE = List.of(strict("uuuu-MM-dd"), strict("d/M/uuuu"));
    private static final List<DateTimeFormatter> TIME = List.of(strict("H:mm:ss"), strict("H:mm"));
    private static final Pattern WITH_OFFSET = Pattern.compile(".*(?:[zZ]|[+-]\\d\\d:?\\d\\d)$");

    private PunchTimeParser() {
    }

    /**
     * @param dateTime date and time in one cell, or null
     * @param date     the date cell, or null
     * @param time     the time cell, or null; with no date at all it may be a full date and time
     */
    static Parsed parse(String dateTime, String date, String time, ZoneId zone) {
        if (dateTime != null) {
            return dateTime(dateTime, zone);
        }
        if (date != null && time != null) {
            LocalDate day = first(DATE, date, LocalDate::parse);
            LocalTime clock = first(TIME, time, LocalTime::parse);
            return day == null || clock == null ? Parsed.error(INVALID)
                    : Parsed.ok(LocalDateTime.of(day, clock).atZone(zone).toInstant());
        }
        if (time != null) {
            return dateTime(time, zone);
        }
        return Parsed.error(MISSING);
    }

    private static Parsed dateTime(String text, ZoneId zone) {
        String value = text.strip();
        if (WITH_OFFSET.matcher(value).matches()) {
            try {
                return Parsed.ok(OffsetDateTime.parse(value.replace(' ', 'T')).toInstant());
            } catch (DateTimeParseException ex) {
                return Parsed.error(INVALID);
            }
        }
        LocalDateTime local = first(DATE_TIME, value, LocalDateTime::parse);
        return local == null ? Parsed.error(INVALID) : Parsed.ok(local.atZone(zone).toInstant());
    }

    private static <T> T first(List<DateTimeFormatter> formats, String text, Parse<T> parse) {
        for (DateTimeFormatter format : formats) {
            try {
                return parse.apply(text.strip(), format);
            } catch (DateTimeParseException ex) {
                // try the next format
            }
        }
        return null;
    }

    private static DateTimeFormatter strict(String pattern) {
        return DateTimeFormatter.ofPattern(pattern).withResolverStyle(ResolverStyle.STRICT);
    }

    @FunctionalInterface
    private interface Parse<T> {
        T apply(String text, DateTimeFormatter format);
    }
}
