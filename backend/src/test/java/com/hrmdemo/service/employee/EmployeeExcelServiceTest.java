package com.hrmdemo.service.employee;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.accessscope.DataScope;
import com.hrmdemo.dto.auth.AccountResponse;
import com.hrmdemo.dto.catalog.CatalogItemRef;
import com.hrmdemo.dto.employee.EmployeeExportQuery;
import com.hrmdemo.dto.employee.EmployeeSpreadsheet;
import com.hrmdemo.dto.orgunit.OrgUnitOption;
import com.hrmdemo.dto.orgunit.OrgUnitOptionsResponse;
import com.hrmdemo.dto.orgunit.OrgUnitSummary;
import com.hrmdemo.entity.catalog.Catalog;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.EmployeeIdentityFields;
import com.hrmdemo.entity.employee.EmployeeJobFields;
import com.hrmdemo.entity.employee.EmployeePersonalFields;
import com.hrmdemo.entity.employee.EmployeeStatus;
import com.hrmdemo.entity.employee.Gender;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.auth.AccountService;
import com.hrmdemo.service.catalog.CatalogService;
import com.hrmdemo.service.orgunit.OrgUnitService;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

/** The template and the export: permissions, the row limit, masking, the manager columns and the dates. */
@ExtendWith(MockitoExtension.class)
class EmployeeExcelServiceTest {

    /** 18:30 UTC is already the next day in Vietnam. */
    static final Instant NOW = Instant.parse("2026-10-09T18:30:00Z");
    static final UUID DEPARTMENT = UUID.fromString("00000000-0000-0000-0000-0000000000a1");
    static final UUID TEAM = UUID.fromString("00000000-0000-0000-0000-0000000000a2");
    static final UUID POSITION = UUID.fromString("00000000-0000-0000-0000-0000000000c1");
    static final EmployeeExportQuery ALL = new EmployeeExportQuery(null, null, true, null, null, null);

    @Mock
    EmployeeListService listService;
    @Mock
    EmployeeRepository employees;
    @Mock
    OrgUnitService orgUnitService;
    @Mock
    CatalogService catalogService;
    @Mock
    AccountService accountService;

    EmployeeExcelService service;
    Employee head;
    Employee member;
    Employee assigned;

    @BeforeEach
    void setUp() {
        head = stored("NV00002", "Lê Văn Hùng", TEAM, null, "040090123456");
        member = stored("NV00010", "Trần Thị Mai", TEAM, null, "079186005678");
        assigned = stored("NV00011", "Phạm Thu Hà", TEAM, head.getId(), "001195001234");
        // A Line manager who heads TEAM sees TEAM only.
        AccessScopeService scopes = new AccessScopeService(
                employeeId -> employeeId.equals(head.getId()) ? Set.of(TEAM) : Set.of());
        service = new EmployeeExcelService(listService, employees, orgUnitService, catalogService, accountService,
                scopes, Clock.fixed(NOW, ZoneOffset.UTC), 5);

        lenient().when(orgUnitService.summaries()).thenReturn(List.of(
                new OrgUnitSummary(DEPARTMENT, null, "PTPM", "Phòng Phát triển phần mềm", true, null),
                new OrgUnitSummary(TEAM, DEPARTMENT, "WEB", "Nhóm Web", true, head.getId())));
        lenient().when(orgUnitService.options(any())).thenReturn(new OrgUnitOptionsResponse(List.of(
                new OrgUnitOption(DEPARTMENT, "PTPM", "Phòng Phát triển phần mềm", null, true),
                new OrgUnitOption(TEAM, "WEB", "Nhóm Web", DEPARTMENT, true))));
        lenient().when(catalogService.findItems(eq(Catalog.POSITION), anyCollection()))
                .thenReturn(Map.of(POSITION, new CatalogItemRef(POSITION, "CV", "Chuyên viên", true)));
        lenient().when(catalogService.activeItems(Catalog.POSITION))
                .thenReturn(List.of(new CatalogItemRef(POSITION, "CV", "Chuyên viên", true)));
        lenient().when(employees.findAllById(anyCollection())).thenReturn(List.of(head));
        lenient().when(accountService.account(any(), any())).thenAnswer(call -> new AccountResponse(
                call.getArgument(1), "x@hrm.test", "Trần Thị Mai", Set.of("HR"), DataScope.COMPANY, "ACTIVE", null,
                null, NOW));
    }

    @Test
    void theTemplateNeedsTheEditPermission() {
        assertForbidden(() -> service.template(caller("DIRECTOR", null)));
        assertForbidden(() -> service.template(caller("ACCOUNTANT", null)));
        verifyNoInteractions(orgUnitService, catalogService);

        EmployeeSpreadsheet template = service.template(caller("HR", null));
        assertThat(template.fileName()).isEqualTo("mau-nhap-nhan-vien.xlsx");
        assertThat(template.rowCount()).isZero();
    }

    @Test
    void theExportNeedsTheViewPermission() {
        assertForbidden(() -> service.export(caller("PROJECT_MANAGER", null), ALL));
        verifyNoInteractions(listService);
    }

    @Test
    void moreRowsThanTheLimitAreRefusedNotCut() {
        when(listService.matching(any(), any(), any(), eq(true), any(), any(), any(), isNull(), eq(0), eq(5)))
                .thenReturn(new PageImpl<>(List.of(head, member), PageRequest.of(0, 5), 6));

        assertThatThrownBy(() -> service.export(caller("HR", null), ALL))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(ex.getCode()).isEqualTo("export.too_many_rows");
                    assertThat(ex.getProperties()).containsEntry("limit", 5).containsEntry("total", 6L);
                });
    }

    @Test
    void withTheSensitivePermissionTheNumbersAreFullAndTheFileIsNamedAfterTodayInVietnam() throws IOException {
        matches(head, member);

        EmployeeSpreadsheet file = service.export(caller("HR", null), ALL);

        assertThat(file.fileName()).isEqualTo("nhan-vien-2026-10-10.xlsx");
        assertThat(file.rowCount()).isEqualTo(2);
        try (XSSFWorkbook workbook = read(file)) {
            assertThat(column(workbook, "E")).containsExactly("040090123456", "079186005678");
            assertThat(column(workbook, "H")).containsExactly("040090123456", "079186005678");
            assertThat(workbook.getSheet("Thông tin").getRow(2).getCell(1).getStringCellValue())
                    .isEqualTo("10/10/2026 01:30");
            assertThat(workbook.getSheet("Thông tin").getRow(7) == null).as("no mask note").isTrue();
        }
    }

    @Test
    void withoutItTheNumbersAreMaskedButForTheCallersOwnRow() throws IOException {
        matches(head, member);

        EmployeeSpreadsheet file = service.export(caller("DIRECTOR", member.getId()), ALL);

        try (XSSFWorkbook workbook = read(file)) {
            assertThat(column(workbook, "E")).containsExactly("••••••••3456", "079186005678");
            assertThat(column(workbook, "H")).containsExactly("••••••••3456", "079186005678");
            assertThat(column(workbook, "A")).containsExactly("NV00002", "NV00010");
            assertThat(workbook.getSheet("Thông tin").getRow(7).getCell(0).getStringCellValue())
                    .startsWith("Số CCCD, mã số thuế, số sổ BHXH đã được che");
        }
    }

    @Test
    void onlyAManagerHrChoseGoesInTheCodeColumnTheEffectiveOneInTheNameColumn() throws IOException {
        matches(member, assigned);

        try (XSSFWorkbook workbook = read(service.export(caller("HR", null), ALL))) {
            assertThat(column(workbook, "O")).containsExactly("", "NV00002");
            assertThat(column(workbook, "T")).containsExactly("Lê Văn Hùng (NV00002)", "Lê Văn Hùng (NV00002)");
            assertThat(column(workbook, "M")).containsExactly("WEB", "WEB");
            assertThat(column(workbook, "R")).containsExactly("Nhóm Web", "Nhóm Web");
            assertThat(column(workbook, "N")).containsExactly("CV", "CV");
        }
    }

    @Test
    void danhMucListsTheActiveUnitsTheScopeCoversAndTheInfoSheetTheFilters() throws IOException {
        EmployeeExportQuery filtered = new EmployeeExportQuery("mai", TEAM, true, UUID.randomUUID(),
                "PROBATION,OFFICIAL", null);
        when(listService.matching(any(), eq("mai"), eq(TEAM), eq(true), any(), eq("PROBATION,OFFICIAL"), any(), isNull(),
                anyInt(), anyInt())).thenReturn(new PageImpl<>(List.of(member)));
        // The position filter names an item that is gone.
        when(catalogService.findItem(eq(Catalog.POSITION), any())).thenReturn(Optional.empty());

        try (XSSFWorkbook workbook = read(service.export(caller("LINE_MANAGER", head.getId()), filtered))) {
            Sheet reference = workbook.getSheet("Danh mục");
            assertThat(reference.getRow(3).getCell(0).getStringCellValue()).isEqualTo("WEB");
            assertThat(reference.getRow(4) == null || reference.getRow(4).getCell(0) == null)
                    .as("PTPM is outside the scope").isTrue();
            assertThat(workbook.getSheet("Thông tin").getRow(4).getCell(1).getStringCellValue())
                    .isEqualTo("Tìm “mai” · Nhóm Web (gồm đơn vị con) · Chức danh không còn · Thử việc, Chính thức");
        }
    }

    @Test
    void noFilterReadsKhongLoc() throws IOException {
        matches(member);

        try (XSSFWorkbook workbook = read(service.export(caller("HR", null), ALL))) {
            assertThat(workbook.getSheet("Thông tin").getRow(4).getCell(1).getStringCellValue())
                    .isEqualTo("Không lọc");
        }
    }

    // --- helpers ---

    private void matches(Employee... found) {
        lenient().when(listService.matching(any(), any(), any(), eq(true), any(), any(), any(), isNull(), eq(0), eq(5)))
                .thenReturn(new PageImpl<>(List.of(found)));
    }

    private Employee stored(String code, String fullName, UUID orgUnitId, UUID managerId, String idNumber) {
        Employee employee = new Employee(code,
                new EmployeePersonalFields(fullName, LocalDate.of(1990, 6, 18), Gender.FEMALE, null, null, null, null,
                        null, null),
                new EmployeeIdentityFields(idNumber, null, null, idNumber, null),
                new EmployeeJobFields(orgUnitId, POSITION, managerId, LocalDate.of(2020, 1, 1),
                        EmployeeStatus.OFFICIAL), NOW);
        ReflectionTestUtils.setField(employee, "id", UUID.randomUUID());
        return employee;
    }

    private static CurrentAccount caller(String role, UUID employeeId) {
        return new CurrentAccount(UUID.randomUUID(), employeeId, Set.of(role));
    }

    private static XSSFWorkbook read(EmployeeSpreadsheet file) throws IOException {
        return new XSSFWorkbook(new ByteArrayInputStream(file.content()));
    }

    /** One column of "Nhân viên" below the header; an empty cell reads "". */
    private static List<String> column(XSSFWorkbook workbook, String letter) {
        int index = org.apache.poi.ss.util.CellReference.convertColStringToIndex(letter);
        Sheet sheet = workbook.getSheet("Nhân viên");
        List<String> values = new ArrayList<>();
        for (int r = 1; r <= sheet.getLastRowNum(); r++) {
            Row row = sheet.getRow(r);
            Cell cell = row.getCell(index);
            values.add(cell == null ? "" : cell.getStringCellValue());
        }
        return values;
    }

    private static void assertForbidden(Runnable action) {
        assertThatThrownBy(action::run).isInstanceOfSatisfying(ApiException.class,
                ex -> assertThat(ex.getCode()).isEqualTo("auth.forbidden"));
    }
}
