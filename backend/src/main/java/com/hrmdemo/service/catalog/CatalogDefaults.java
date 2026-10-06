package com.hrmdemo.service.catalog;

import java.time.LocalDate;
import java.util.List;

import com.hrmdemo.dto.catalog.CatalogItemRequest;
import com.hrmdemo.entity.catalog.Catalog;

/**
 * The defaults every company starts with (design spec of HRM-05, section 4). Each set is seeded once under its key
 * (table {@code catalog_default_seed}): a default the company deleted does not come back. Holidays come one set per
 * year, added by a release once the year's dates are announced; Tết follows the lunar calendar and is not computed.
 */
final class CatalogDefaults {

    /** One set: its key, its catalog and its items. */
    record DefaultSet(String key, Catalog catalog, List<CatalogItemRequest> items) {
    }

    static final List<DefaultSet> SETS = List.of(
            new DefaultSet("positions", Catalog.POSITION, List.of(
                    coded("GD", "Giám đốc"),
                    coded("PGD", "Phó giám đốc"),
                    coded("TP", "Trưởng phòng"),
                    coded("TN", "Trưởng nhóm"),
                    coded("CV", "Chuyên viên"),
                    coded("NV", "Nhân viên"),
                    coded("TTS", "Thực tập sinh"))),
            // Bộ luật Lao động 2019: Điều 20 (indefinite, or fixed-term up to 36 months) and Điều 24 (probation).
            new DefaultSet("contract-types", Catalog.CONTRACT_TYPE, List.of(
                    contract("KXDTH", "HĐLĐ không xác định thời hạn", "INDEFINITE", null),
                    contract("XDTH", "HĐLĐ xác định thời hạn", "FIXED", 36),
                    contract("TV", "Hợp đồng thử việc", "PROBATION", null))),
            // Defaults for HR to review. The tax-free parts of a meal or phone allowance are payroll parameters
            // (HRM-28), not flags here.
            new DefaultSet("allowance-types", Catalog.ALLOWANCE_TYPE, List.of(
                    allowance("CHUC_VU", "Phụ cấp chức vụ", true, true),
                    allowance("TRACH_NHIEM", "Phụ cấp trách nhiệm", true, true),
                    allowance("AN_TRUA", "Phụ cấp ăn trưa", false, true),
                    allowance("DIEN_THOAI", "Phụ cấp điện thoại", false, true),
                    allowance("XANG_XE", "Phụ cấp xăng xe", false, true),
                    allowance("NHA_O", "Phụ cấp nhà ở", false, true))),
            new DefaultSet("skills", Catalog.SKILL, List.of(
                    coded("JAVA", "Java"),
                    coded("SPRING_BOOT", "Spring Boot"),
                    coded("REACT", "React"),
                    coded("TYPESCRIPT", "TypeScript"),
                    coded("POSTGRESQL", "PostgreSQL"),
                    coded("KIEM_THU", "Kiểm thử phần mềm"),
                    coded("PTNV", "Phân tích nghiệp vụ"),
                    coded("QLDA", "Quản lý dự án"),
                    coded("TIENG_ANH", "Tiếng Anh"),
                    coded("TIENG_NHAT", "Tiếng Nhật"))),
            new DefaultSet("project-roles", Catalog.PROJECT_ROLE, List.of(
                    coded("PM", "Quản lý dự án"),
                    coded("TECH_LEAD", "Trưởng nhóm kỹ thuật"),
                    coded("BA", "Phân tích nghiệp vụ"),
                    coded("DEV", "Lập trình viên"),
                    coded("QA", "Kiểm thử viên"),
                    coded("UI_UX", "Thiết kế UI/UX"),
                    coded("DEVOPS", "DevOps"))),
            // Bộ luật Lao động 2019 Điều 112, the Tết schedule announced for 2026, and Nghị quyết 28/2026/QH16
            // for 24/11 (in force since 01/07/2026). 26/04 is a Sunday, so 27/04 is the day off in lieu.
            new DefaultSet("holidays-2026", Catalog.HOLIDAY, List.of(
                    holiday("Tết Dương lịch", "2026-01-01", "2026-01-01"),
                    holiday("Tết Nguyên đán", "2026-02-16", "2026-02-20"),
                    holiday("Giỗ Tổ Hùng Vương", "2026-04-26", "2026-04-26"),
                    holiday("Nghỉ bù Giỗ Tổ Hùng Vương", "2026-04-27", "2026-04-27"),
                    holiday("Ngày Chiến thắng", "2026-04-30", "2026-04-30"),
                    holiday("Quốc tế Lao động", "2026-05-01", "2026-05-01"),
                    holiday("Quốc khánh", "2026-09-01", "2026-09-02"),
                    holiday("Ngày Văn hóa Việt Nam", "2026-11-24", "2026-11-24"))));

    private CatalogDefaults() {
    }

    private static CatalogItemRequest coded(String code, String name) {
        return new CatalogItemRequest(code, name, null, null, null, null, null, null);
    }

    private static CatalogItemRequest contract(String code, String name, String term, Integer maxMonths) {
        return new CatalogItemRequest(code, name, term, maxMonths, null, null, null, null);
    }

    private static CatalogItemRequest allowance(String code, String name, boolean insurable, boolean taxable) {
        return new CatalogItemRequest(code, name, null, null, insurable, taxable, null, null);
    }

    private static CatalogItemRequest holiday(String name, String startDate, String endDate) {
        return new CatalogItemRequest(null, name, null, null, null, null, LocalDate.parse(startDate),
                LocalDate.parse(endDate));
    }
}
