package com.hrmdemo.service.attendance;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * The columns of a punch log file, found by header text so their order does not matter and unknown columns (a
 * machine's own "No.", "Name", "Status") are ignored. A header is compared without accents, case, spaces and
 * punctuation, so "Mã nhân viên", "ma_nhan_vien" and "MaNhanVien" are the same.
 */
enum PunchColumn {

    /** The Employee code. */
    CODE,
    /** Date and time in one cell. */
    DATE_TIME,
    /** The date, when the file keeps date and time apart. */
    DATE,
    /** The time of day; a machine that calls its date-time column "Time" is read as a date-time. */
    TIME,
    /** The machine the punch came from. */
    DEVICE;

    private static final Map<String, PunchColumn> BY_HEADER = Map.ofEntries(
            Map.entry("manhanvien", CODE), Map.entry("manv", CODE), Map.entry("employeecode", CODE),
            Map.entry("code", CODE), Map.entry("userid", CODE), Map.entry("employeeid", CODE),
            Map.entry("datetime", DATE_TIME), Map.entry("timestamp", DATE_TIME), Map.entry("punchtime", DATE_TIME),
            Map.entry("thoigian", DATE_TIME), Map.entry("thoigianquet", DATE_TIME), Map.entry("ngaygio", DATE_TIME),
            Map.entry("date", DATE), Map.entry("ngay", DATE), Map.entry("ngayquet", DATE),
            Map.entry("time", TIME), Map.entry("gio", TIME), Map.entry("gioquet", TIME),
            Map.entry("device", DEVICE), Map.entry("machine", DEVICE), Map.entry("may", DEVICE),
            Map.entry("maychamcong", DEVICE), Map.entry("devicename", DEVICE));

    /** The column a header names, or empty for a header the import does not use. */
    static Optional<PunchColumn> ofHeader(String header) {
        return Optional.ofNullable(BY_HEADER.get(normalize(header)));
    }

    static String normalize(String header) {
        if (header == null) {
            return "";
        }
        String plain = Normalizer.normalize(header.replace('đ', 'd').replace('Đ', 'D'), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return plain.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }
}
