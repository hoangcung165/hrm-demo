package com.hrmdemo.service.exampledata;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hrmdemo.dto.employee.EmployeeCreateRequest;
import com.hrmdemo.dto.employee.EmployeeIdentityRequest;
import com.hrmdemo.dto.employee.EmployeeJobRequest;
import com.hrmdemo.dto.employee.EmployeePersonalRequest;
import com.hrmdemo.entity.SearchText;
import com.hrmdemo.entity.auth.DemoPersona;

/**
 * The fictional Nhân viên of the example company: one head per active unit, the Giám đốc directly under the
 * company, and a few members per unit. Listed in the order they are added, so the Giám đốc gets {@code NV00001}.
 * The first 24 are also the people {@code web/e2e/employees-flow.mjs} looks for by name. Every identity number is
 * made up, but shaped like a real one (see {@link #idNumber}).
 */
final class ExampleEmployees {

    /** Province codes of the CCCD and the city of the address. */
    private static final Map<String, String> CITIES = Map.of(
            "001", "Hà Nội",
            "031", "Hải Phòng",
            "034", "Thái Bình",
            "036", "Nam Định",
            "038", "Thanh Hóa",
            "040", "Nghệ An",
            "046", "Huế",
            "048", "Đà Nẵng",
            "079", "TP. Hồ Chí Minh",
            "092", "Cần Thơ");

    private static final List<String> STREETS = List.of("Lê Lợi", "Trần Hưng Đạo", "Nguyễn Trãi", "Hai Bà Trưng",
            "Lý Thường Kiệt", "Phan Chu Trinh", "Điện Biên Phủ", "Nguyễn Văn Linh", "Quang Trung", "Lê Duẩn");

    private static final String ISSUE_PLACE = "Cục Cảnh sát quản lý hành chính về trật tự xã hội";

    /**
     * @param unitCode     code of the example unit, or null for directly under the company
     * @param positionCode code of a default Chức danh ({@code CatalogDefaults})
     * @param head         whether the Employee becomes the head of its unit
     * @param persona      the demo persona Account linked to this Employee when the personas are on, or null
     */
    record ExampleEmployee(String fullName, String unitCode, String positionCode, boolean male, LocalDate dateOfBirth,
            LocalDate hireDate, String province, boolean probation, boolean head, DemoPersona persona) {
    }

    static final List<ExampleEmployee> EMPLOYEES = List.of(
            // The first 24, in this order, as in web/e2e/employees-flow.mjs.
            persona("Phạm Quốc Bảo", null, "GD", true, "1975-04-12", "2015-03-01", "001", DemoPersona.DIRECTOR),
            head("Nguyễn Văn Khoa", "PTPM", "TP", true, "1982-09-05", "2016-06-01", "079", null),
            head("Trần Thị Mai", "HCNS", "TP", false, "1986-03-12", "2017-02-15", "079", DemoPersona.HR),
            head("Hoàng Thị Thu", "TCKT", "TP", false, "1984-11-20", "2016-09-01", "038", DemoPersona.ACCOUNTANT),
            head("Trần Quang Vinh", "DVKH", "TP", true, "1983-07-08", "2017-05-02", "036", null),
            head("Đặng Hoàng Nam", "KD", "TP", true, "1985-01-25", "2018-01-02", "001", null),
            head("Lê Văn Hùng", "WEB", "TN", true, "1990-06-18", "2018-07-02", "040", DemoPersona.LINE_MANAGER),
            head("Đỗ Thị Thu Hằng", "MOBILE", "TN", false, "1991-02-14", "2019-03-01", "034", null),
            head("Hồ Sỹ Quang", "CNDN", "TP", true, "1980-10-30", "2017-10-02", "048", null),
            head("Vũ Đức Thắng", "DEVOPS", "TN", true, "1989-12-03", "2019-08-01", "031", null),
            head("Hoàng Gia Huy", "DATA", "TN", true, "1992-05-21", "2020-04-01", "079", null),
            head("Bùi Thị Ngọc Lan", "QA", "TN", false, "1990-08-09", "2019-11-01", "036", null),
            persona("Vũ Thị Lan", "PTPM", "CV", false, "1988-04-27", "2018-10-01", "001", DemoPersona.PROJECT_MANAGER),
            head("Ngô Thanh Sơn", "TK", "TN", true, "1987-09-14", "2018-04-02", "040", null),
            member("Trần Đức Hòa", "PMDN", "CV", true, "1993-03-03", "2021-03-01", "048"),
            head("Phan Thị Mỹ Linh", "HTKH", "TN", false, "1992-12-19", "2020-09-01", "046", null),
            head("Trịnh Văn Phúc", "KDGP", "TN", true, "1986-06-06", "2019-06-03", "038", null),
            member("Võ Mạnh Cường", "KDGP", "CV", true, "1994-10-11", "2022-02-14", "092"),
            head("Lương Văn Hiển", "PMDN", "TP", true, "1984-02-28", "2018-08-01", "048", null),
            head("Lý Thảo Vy", "MKT", "TN", false, "1993-07-17", "2021-05-04", "079", null),
            persona("Nguyễn Văn An", "WEB", "NV", true, "1997-01-09", "2022-07-01", "001", DemoPersona.EMPLOYEE),
            probation("Mạc Thị Quỳnh", "WEB", "NV", false, "1999-11-02", "2026-08-17", "031"),
            probation("Phan Khánh Duy", "WEBDN", "NV", true, "1998-04-15", "2026-09-03", "048"),
            probation("Phạm Thị Lan Anh", "QA", "NV", false, "1999-08-22", "2026-09-14", "034"),
            // The heads of the units the e2e flow leaves without one, then more members.
            head("Đoàn Minh Tuấn", "WEBDN", "TN", true, "1991-03-26", "2020-02-03", "048", null),
            head("Nguyễn Thị Hồng Nhung", "MOBDN", "TN", false, "1992-09-07", "2020-06-01", "046", null),
            head("Huỳnh Văn Lộc", "KTDN", "TP", true, "1987-05-13", "2019-01-02", "048", null),
            member("Trương Thị Ngọc Hân", "HCNS", "CV", false, "1994-02-05", "2021-08-02", "079"),
            member("Đinh Quốc Toàn", "TCKT", "CV", true, "1990-10-21", "2020-03-02", "038"),
            member("Lâm Thị Kim Oanh", "TCKT", "NV", false, "1996-12-12", "2023-04-03", "092"),
            member("Cao Minh Trí", "WEB", "CV", true, "1995-06-30", "2021-10-01", "079"),
            member("Tô Thị Bích Ngọc", "MOBILE", "CV", false, "1995-01-18", "2022-03-01", "001"),
            member("Kiều Văn Thành", "MOBILE", "NV", true, "1998-07-07", "2024-06-03", "034"),
            member("Lưu Đức Mạnh", "DEVOPS", "CV", true, "1993-11-11", "2021-12-01", "031"),
            member("Châu Thị Thanh Tâm", "DATA", "CV", false, "1996-03-08", "2023-02-01", "092"),
            member("Quách Văn Long", "QA", "CV", true, "1994-09-16", "2022-05-03", "036"),
            member("Dương Thị Hạnh", "TK", "CV", false, "1993-04-04", "2021-07-01", "040"),
            member("Thái Văn Bình", "HTKH", "NV", true, "1997-10-25", "2023-09-05", "046"),
            probation("Mai Thị Thùy Dung", "KDGP", "NV", false, "1998-02-20", "2026-08-03", "079"),
            member("La Văn Khải", "WEBDN", "NV", true, "1996-05-29", "2024-03-04", "048"),
            probation("Ông Thị Diễm My", "MOBDN", "NV", false, "1999-06-11", "2026-09-21", "048"),
            member("Hà Quang Minh", "KTDN", "CV", true, "1995-08-03", "2022-10-03", "048"),
            member("Tống Thị Yến", "MKT", "CV", false, "1994-12-01", "2022-08-01", "001"),
            probation("Phùng Văn Tiến", "DEVOPS", "TTS", true, "2004-03-15", "2026-09-07", "031"));

    private ExampleEmployees() {
    }

    /**
     * The request that adds the {@code index}-th Employee (0-based).
     *
     * @param orgUnitId  the unit's id, or null for directly under the company
     * @param positionId the position's id
     */
    static EmployeeCreateRequest toRequest(int index, ExampleEmployee employee, UUID orgUnitId, UUID positionId) {
        int number = index + 1;
        String idNumber = idNumber(employee, number);
        EmployeePersonalRequest personal = new EmployeePersonalRequest(employee.dateOfBirth(),
                employee.male() ? "MALE" : "FEMALE", email(employee.fullName()), phone(number),
                "%d %s, %s".formatted(10 + number * 3, STREETS.get(index % STREETS.size()),
                        CITIES.get(employee.province())),
                null);
        LocalDate issued = LocalDate.of(2021 + number % 2, 1 + number % 12, 1 + number % 27);
        EmployeeIdentityRequest identity = new EmployeeIdentityRequest(idNumber, issued, ISSUE_PLACE, idNumber,
                socialInsuranceNumber(employee, number));
        EmployeeJobRequest job = new EmployeeJobRequest(orgUnitId, positionId, null, employee.hireDate(),
                employee.probation() ? "PROBATION" : "OFFICIAL");
        return new EmployeeCreateRequest(employee.fullName(), personal, identity, job);
    }

    /**
     * A CCCD as the rules shape it: the province of birth registration (3 digits), the century and gender (0/1 for
     * a man/woman born in the 1900s, 2/3 from 2000), the year of birth (2 digits), then 6 digits. The last six are a
     * multiple of a number coprime with 10^6, so no two Employees share them.
     */
    static String idNumber(ExampleEmployee employee, int number) {
        int year = employee.dateOfBirth().getYear();
        int century = (year >= 2000 ? 2 : 0) + (employee.male() ? 0 : 1);
        return "%s%d%02d%06d".formatted(employee.province(), century, year % 100, (number * 48_271) % 1_000_000);
    }

    /** An old-style 10-digit số BHXH: the province (2 digits), then 8 digits unique per Employee. */
    private static String socialInsuranceNumber(ExampleEmployee employee, int number) {
        return "%s%08d".formatted(employee.province().substring(1), 31_400_000 + number * 7_919);
    }

    private static String phone(int number) {
        return "09%08d".formatted((number * 7_654_321L) % 100_000_000);
    }

    /** Given name, then family name, without accents: "Trần Thị Mai" → {@code mai.tran@example.com}. */
    private static String email(String fullName) {
        String[] words = SearchText.of(fullName).split(" ");
        return words[words.length - 1] + "." + words[0] + "@example.com";
    }

    private static ExampleEmployee head(String fullName, String unitCode, String positionCode, boolean male,
            String dateOfBirth, String hireDate, String province, DemoPersona persona) {
        return new ExampleEmployee(fullName, unitCode, positionCode, male, LocalDate.parse(dateOfBirth),
                LocalDate.parse(hireDate), province, false, true, persona);
    }

    private static ExampleEmployee persona(String fullName, String unitCode, String positionCode, boolean male,
            String dateOfBirth, String hireDate, String province, DemoPersona persona) {
        return new ExampleEmployee(fullName, unitCode, positionCode, male, LocalDate.parse(dateOfBirth),
                LocalDate.parse(hireDate), province, false, false, persona);
    }

    private static ExampleEmployee member(String fullName, String unitCode, String positionCode, boolean male,
            String dateOfBirth, String hireDate, String province) {
        return new ExampleEmployee(fullName, unitCode, positionCode, male, LocalDate.parse(dateOfBirth),
                LocalDate.parse(hireDate), province, false, false, null);
    }

    private static ExampleEmployee probation(String fullName, String unitCode, String positionCode, boolean male,
            String dateOfBirth, String hireDate, String province) {
        return new ExampleEmployee(fullName, unitCode, positionCode, male, LocalDate.parse(dateOfBirth),
                LocalDate.parse(hireDate), province, true, false, null);
    }
}
