package com.hrmdemo.service.employee;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

import com.hrmdemo.entity.employee.EmployeeStatus;
import com.hrmdemo.entity.employee.Gender;
import org.apache.poi.ss.util.CellReference;

/**
 * The columns of sheet "Nhân viên", in order (A, B, …). The template and the import use the import columns; the
 * export also writes the three read-only name columns at the end, which the import ignores. The import
 * (HRM-07/BE-2) matches columns by header text ({@link #ofHeader}), not by position.
 */
enum EmployeeColumn {
    CODE("Mã nhân viên", false, Kind.TEXT, 15, null, false,
            "Để trống khi thêm người mới, hệ thống cấp mã khi nhập. File xuất có sẵn mã.", ""),
    FULL_NAME("Họ và tên", true, Kind.TEXT, 26, null, false,
            "Họ tên đầy đủ, tối đa 150 ký tự.", "Đỗ Thị Hoa"),
    DATE_OF_BIRTH("Ngày sinh", true, Kind.DATE, 13, null, false,
            "Ngày dạng dd/mm/yyyy. Đủ 15 tuổi tại ngày vào làm.", "15/03/1995"),
    GENDER("Giới tính", true, Kind.TEXT, 11, EmployeeReferenceSheet.GENDERS_RANGE, false,
            "Nam hoặc Nữ.", "Nữ"),
    ID_NUMBER("Số CCCD", true, Kind.TEXT, 16, null, false,
            "12 chữ số. Định dạng ô là Text để giữ số 0 đầu.", "001195012345"),
    ID_ISSUE_DATE("Ngày cấp CCCD", false, Kind.DATE, 15, null, false,
            "Ngày dạng dd/mm/yyyy, không sau hôm nay.", "10/05/2021"),
    ID_ISSUE_PLACE("Nơi cấp CCCD", false, Kind.TEXT, 24, null, false,
            "Tối đa 150 ký tự.", "Cục Cảnh sát QLHC về TTXH"),
    TAX_CODE("Mã số thuế", false, Kind.TEXT, 15, null, false,
            "Để trống nếu là số CCCD (từ 01/07/2025). Nhập mã 10 số nếu được cấp trước đó.", ""),
    SOCIAL_INSURANCE_NUMBER("Số sổ BHXH", false, Kind.TEXT, 15, null, false,
            "10 chữ số, hoặc số CCCD.", ""),
    PHONE("Số điện thoại", false, Kind.TEXT, 15, null, false,
            "10 chữ số bắt đầu bằng 0, hoặc +84.", "0912 345 678"),
    PERSONAL_EMAIL("Email", false, Kind.TEXT, 26, null, false,
            "Email cá nhân.", "do.thi.hoa@mail.vn"),
    ADDRESS("Địa chỉ", false, Kind.TEXT, 32, null, false,
            "Tối đa 500 ký tự.", "12 Trần Phú, Hà Đông, Hà Nội"),
    ORG_UNIT_CODE("Mã đơn vị", true, Kind.TEXT, 13, EmployeeReferenceSheet.UNITS_RANGE, false,
            "Mã đơn vị ở sheet Danh mục.", "WEB"),
    POSITION_CODE("Mã chức danh", true, Kind.TEXT, 14, EmployeeReferenceSheet.POSITIONS_RANGE, false,
            "Mã chức danh ở sheet Danh mục.", "CV"),
    MANAGER_CODE("Mã NV quản lý", false, Kind.TEXT, 15, null, false,
            "Mã nhân viên của người quản lý. Để trống để theo Trưởng đơn vị.", ""),
    HIRE_DATE("Ngày vào làm", true, Kind.DATE, 14, null, false,
            "Ngày dạng dd/mm/yyyy, tối đa 1 năm sau hôm nay.", "01/11/2026"),
    STATUS("Trạng thái", false, Kind.TEXT, 13, EmployeeReferenceSheet.STATUSES_RANGE, false,
            "Thử việc hoặc Chính thức. Để trống là Thử việc.", "Thử việc"),
    ORG_UNIT_NAME("Tên đơn vị", false, Kind.TEXT, 24, null, true,
            "Chỉ để xem, không được nhập.", ""),
    POSITION_NAME("Tên chức danh", false, Kind.TEXT, 22, null, true,
            "Chỉ để xem, không được nhập.", ""),
    MANAGER_NAME("Quản lý trực tiếp", false, Kind.TEXT, 28, null, true,
            "Chỉ để xem, không được nhập. Người quản lý hiện tại, kể cả Trưởng đơn vị.", "");

    /** Ends the header of a required column; the import ignores it. */
    static final String REQUIRED_MARK = " *";
    private static final Pattern SPACES = Pattern.compile("[\\s\\p{Z}]+");

    enum Kind {
        /** Cell format Text ({@code @}), so Excel keeps leading zeros. */
        TEXT,
        /** A real date cell shown as dd/mm/yyyy. */
        DATE
    }

    final String label;
    final boolean required;
    final Kind kind;
    /** Column width in characters. */
    final int width;
    /** Named range of the dropdown on "Danh mục", or null. */
    final String list;
    /** Written by the export only; the import ignores it. */
    final boolean exportOnly;
    /** How to fill it in ("Cách nhập"): the header note and the guide. */
    final String how;
    final String example;

    EmployeeColumn(String label, boolean required, Kind kind, int width, String list, boolean exportOnly,
            String how, String example) {
        this.label = label;
        this.required = required;
        this.kind = kind;
        this.width = width;
        this.list = list;
        this.exportOnly = exportOnly;
        this.how = how;
        this.example = example;
    }

    /** The header text, e.g. {@code "Họ và tên *"}. */
    String header() {
        return required ? label + REQUIRED_MARK : label;
    }

    /** The column letter in the written sheets, e.g. {@code "E"}. */
    String letter() {
        return CellReference.convertNumToColString(ordinal());
    }

    /**
     * The path of the field in {@code POST /api/employees} the column fills (as in the field errors), e.g.
     * {@code identity.idNumber}; {@code code} for the code column; null for the read-only export columns.
     */
    String field() {
        return switch (this) {
            case CODE -> "code";
            case FULL_NAME -> "fullName";
            case DATE_OF_BIRTH -> "personal.dateOfBirth";
            case GENDER -> "personal.gender";
            case ID_NUMBER -> "identity.idNumber";
            case ID_ISSUE_DATE -> "identity.idIssueDate";
            case ID_ISSUE_PLACE -> "identity.idIssuePlace";
            case TAX_CODE -> "identity.taxCode";
            case SOCIAL_INSURANCE_NUMBER -> "identity.socialInsuranceNumber";
            case PHONE -> "personal.phone";
            case PERSONAL_EMAIL -> "personal.personalEmail";
            case ADDRESS -> "personal.address";
            case ORG_UNIT_CODE -> "job.orgUnitId";
            case POSITION_CODE -> "job.positionId";
            case MANAGER_CODE -> "job.managerId";
            case HIRE_DATE -> "job.hireDate";
            case STATUS -> "job.status";
            case ORG_UNIT_NAME, POSITION_NAME, MANAGER_NAME -> null;
        };
    }

    /** The import column of a field path, e.g. {@code identity.taxCode} → {@link #TAX_CODE}. */
    static Optional<EmployeeColumn> ofField(String field) {
        return importColumns().stream().filter(column -> column.field().equals(field)).findFirst();
    }

    /** The identity numbers, masked in what the server sends back without EMPLOYEE_SENSITIVE_VIEW. */
    boolean sensitive() {
        return this == ID_NUMBER || this == TAX_CODE || this == SOCIAL_INSURANCE_NUMBER;
    }

    /** Shown greyed: the code (filled by the server) and the read-only export columns. */
    boolean muted() {
        return this == CODE || exportOnly;
    }

    static List<EmployeeColumn> importColumns() {
        return Arrays.stream(values()).filter(column -> !column.exportOnly).toList();
    }

    /**
     * The import column a header cell names: trimmed, without the trailing {@code *}, ignoring case and repeated
     * spaces. Empty for an unknown header (ignored) and for the export's read-only columns.
     */
    static Optional<EmployeeColumn> ofHeader(String text) {
        String key = headerKey(text);
        return key.isEmpty() ? Optional.empty()
                : importColumns().stream().filter(column -> headerKey(column.label).equals(key)).findFirst();
    }

    private static String headerKey(String text) {
        if (text == null) {
            return "";
        }
        String key = SPACES.matcher(text).replaceAll(" ").strip();
        if (key.endsWith("*")) {
            key = key.substring(0, key.length() - 1).strip();
        }
        return key.toLowerCase(Locale.ROOT);
    }

    static String genderLabel(Gender gender) {
        return switch (gender) {
            case MALE -> "Nam";
            case FEMALE -> "Nữ";
        };
    }

    static String statusLabel(EmployeeStatus status) {
        return switch (status) {
            case PROBATION -> "Thử việc";
            case OFFICIAL -> "Chính thức";
            case INACTIVE -> "Đã nghỉ việc";
        };
    }
}
