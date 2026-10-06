package com.hrmdemo.service.catalog;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import javax.sql.DataSource;

import com.hrmdemo.support.IntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * The catalog defaults seeder against real PostgreSQL. It already ran when the context started; each test puts
 * the catalogs back to those of a new installation, runs it itself, and leaves the defaults in place afterwards.
 */
@IntegrationTest
class CatalogDefaultSeederIT {

    @Autowired
    CatalogDefaultSeeder seeder;
    @Autowired
    DataSource dataSource;

    JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        resetToNewInstallation();
    }

    @AfterEach
    void cleanUp() {
        resetToNewInstallation();
        seed();
    }

    @Test
    void aNewCompanyGetsEverySetOfDefaults() {
        seed();

        assertThat(jdbc.queryForList("select seed_set from catalog_default_seed order by seed_set", String.class))
                .containsExactly("allowance-types", "contract-types", "holidays-2026", "positions", "project-roles",
                        "skills");
        assertThat(names("POSITION")).containsExactly("Chuyên viên", "Giám đốc", "Nhân viên", "Phó giám đốc",
                "Thực tập sinh", "Trưởng nhóm", "Trưởng phòng");
        assertThat(jdbc.queryForList(
                "select code, term, max_months from catalog_item where catalog = 'CONTRACT_TYPE' order by code"))
                .containsExactly(
                        row("code", "KXDTH", "term", "INDEFINITE", "max_months", null),
                        row("code", "TV", "term", "PROBATION", "max_months", null),
                        row("code", "XDTH", "term", "FIXED", "max_months", 36));
        assertThat(jdbc.queryForList(
                "select code from catalog_item where catalog = 'ALLOWANCE_TYPE' and insurable order by code",
                String.class)).containsExactly("CHUC_VU", "TRACH_NHIEM");
        assertThat(jdbc.queryForObject(
                "select count(*) from catalog_item where catalog = 'ALLOWANCE_TYPE' and not insurable and taxable",
                Integer.class)).isEqualTo(4);
        assertThat(names("SKILL")).hasSize(10).contains("Java", "Tiếng Nhật");
        assertThat(names("PROJECT_ROLE")).hasSize(7).contains("Quản lý dự án", "DevOps");
        assertThat(jdbc.queryForList(
                "select name || ' ' || start_date || ' ' || end_date from catalog_item"
                        + " where catalog = 'HOLIDAY' order by start_date", String.class))
                .containsExactly(
                        "Tết Dương lịch 2026-01-01 2026-01-01",
                        "Tết Nguyên đán 2026-02-16 2026-02-20",
                        "Giỗ Tổ Hùng Vương 2026-04-26 2026-04-26",
                        "Nghỉ bù Giỗ Tổ Hùng Vương 2026-04-27 2026-04-27",
                        "Ngày Chiến thắng 2026-04-30 2026-04-30",
                        "Quốc tế Lao động 2026-05-01 2026-05-01",
                        "Quốc khánh 2026-09-01 2026-09-02",
                        "Ngày Văn hóa Việt Nam 2026-11-24 2026-11-24");
        assertThat(jdbc.queryForObject("select count(*) from catalog_item where not active", Integer.class))
                .isZero();
    }

    @Test
    void aRestartDoesNotSeedAgainAndADeletedDefaultDoesNotComeBack() {
        seed();
        int before = count();
        jdbc.update("delete from catalog_item where catalog = 'POSITION' and code = 'TTS'");
        jdbc.update("update catalog_item set name = 'Thử việc', search_text = 'thu viec'"
                + " where catalog = 'CONTRACT_TYPE' and code = 'TV'");

        seed();

        assertThat(count()).isEqualTo(before - 1);
        assertThat(names("POSITION")).doesNotContain("Thực tập sinh");
        assertThat(names("CONTRACT_TYPE")).contains("Thử việc").doesNotContain("Hợp đồng thử việc");
    }

    @Test
    void aSetNotYetReceivedIsSeededAndSkipsWhatTheCompanyAlreadyHas() {
        seed();
        // As if a release had just added the skills: the company has its own React, under another code.
        jdbc.update("delete from catalog_item where catalog = 'SKILL'");
        jdbc.update("delete from catalog_default_seed where seed_set = 'skills'");
        jdbc.update("""
                insert into catalog_item (id, legal_entity_id, catalog, code, name, search_text, active,
                    created_at, updated_at)
                select gen_random_uuid(), id, 'SKILL', 'REACT_JS', 'React', 'react', true, now(), now()
                from legal_entity""");

        seed();

        assertThat(jdbc.queryForList("select code from catalog_item where catalog = 'SKILL' and name = 'React'",
                String.class)).containsExactly("REACT_JS");
        assertThat(names("SKILL")).hasSize(10);
        assertThat(jdbc.queryForObject("select count(*) from catalog_default_seed where seed_set = 'skills'",
                Integer.class)).isEqualTo(1);
    }

    private void seed() {
        seeder.run(new DefaultApplicationArguments());
    }

    private void resetToNewInstallation() {
        jdbc.update("delete from catalog_item");
        jdbc.update("delete from catalog_default_seed");
    }

    private int count() {
        return jdbc.queryForObject("select count(*) from catalog_item", Integer.class);
    }

    private List<String> names(String catalog) {
        return jdbc.queryForList("select name from catalog_item where catalog = ? order by search_text", String.class,
                catalog);
    }

    private static Map<String, Object> row(String k1, Object v1, String k2, Object v2, String k3, Object v3) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put(k1, v1);
        row.put(k2, v2);
        row.put(k3, v3);
        return row;
    }
}
