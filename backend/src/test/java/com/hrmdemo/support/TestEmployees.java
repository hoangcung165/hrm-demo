package com.hrmdemo.support;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

import javax.sql.DataSource;

import org.springframework.boot.test.context.TestComponent;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Employees written straight into the table, for tests that need one to exist (a unit head, an Account's link)
 * without going through the API. Imported by {@link IntegrationTest}.
 * <p>
 * Employees are referenced by units, Accounts and catalog items' users, so a test that creates any must call
 * {@link #deleteAll()} when it ends: other tests empty {@code org_unit} and {@code catalog_item}.
 */
@TestComponent
public class TestEmployees {

    private final JdbcTemplate jdbc;
    private final List<UUID> positions = new ArrayList<>();

    public TestEmployees(DataSource dataSource) {
        this.jdbc = new JdbcTemplate(dataSource);
    }

    /** An active (official) Employee of the unit (null: directly under the company), with a position of its own. */
    public UUID create(String fullName, UUID orgUnitId) {
        return create(fullName, orgUnitId, "OFFICIAL");
    }

    public UUID create(String fullName, UUID orgUnitId, String status) {
        UUID id = UUID.randomUUID();
        ThreadLocalRandom random = ThreadLocalRandom.current();
        // Codes the server would issue only after 9 million Employees, so they never meet an issued one.
        String code = "NV9" + String.format("%06d", random.nextInt(1_000_000));
        String idNumber = String.format("%06d%06d", random.nextInt(1_000_000), random.nextInt(1_000_000));
        jdbc.update("""
                insert into employee (id, legal_entity_id, code, full_name, search_text, date_of_birth, gender,
                    id_number, org_unit_id, position_id, hire_date, status, created_at, updated_at)
                values (?, (select id from legal_entity), ?, ?, ?, ?, 'FEMALE', ?, ?, ?, ?, ?, now(), now())""",
                id, code, fullName, fullName.toLowerCase(Locale.ROOT) + " " + code.toLowerCase(Locale.ROOT),
                LocalDate.of(1990, 1, 1), idNumber, orgUnitId, position(), LocalDate.of(2020, 1, 1), status);
        return id;
    }

    /** Gives the Employee another Chức danh, e.g. one a test made through the catalogs API. */
    public void assignPosition(UUID employeeId, UUID positionId) {
        jdbc.update("update employee set position_id = ? where id = ?", positionId, employeeId);
    }

    /** Makes the Employee the head of the unit, as the org screen will once it picks Employees. */
    public void makeHead(UUID orgUnitId, UUID employeeId) {
        jdbc.update("update org_unit set head_employee_id = ? where id = ?", employeeId, orgUnitId);
    }

    /** Links the Account to the Employee; the link reaches the token at the next sign-in. */
    public void link(UUID accountId, UUID employeeId) {
        jdbc.update("update account set employee_id = ? where id = ?", employeeId, accountId);
    }

    /**
     * Every Employee goes, after the links to them (Accounts, unit heads) are cleared; the code counter starts
     * again and the positions made here are removed.
     */
    public void deleteAll() {
        // Approval requests point at their sender (HRM-12).
        jdbc.update("delete from notification");
        jdbc.update("delete from approval_request");
        jdbc.update("delete from approval_delegation");
        jdbc.update("update account set employee_id = null where employee_id is not null");
        jdbc.update("update org_unit set head_employee_id = null where head_employee_id is not null");
        jdbc.update("delete from employee");
        jdbc.update("update employee_code_counter set last_value = 0");
        for (UUID position : positions) {
            jdbc.update("delete from catalog_item where id = ?", position);
        }
        positions.clear();
    }

    /** An active item of the positions catalog, removed again by {@link #deleteAll()}. */
    public UUID position() {
        return position(true);
    }

    public UUID position(boolean active) {
        UUID id = UUID.randomUUID();
        String code = "ZT" + id.toString().replace("-", "").substring(0, 12).toUpperCase(Locale.ROOT);
        jdbc.update("""
                insert into catalog_item (id, legal_entity_id, catalog, code, name, search_text, active, created_at,
                    updated_at)
                values (?, (select id from legal_entity), 'POSITION', ?, ?, ?, ?, now(), now())""",
                id, code, "Test position " + code, "test position " + code.toLowerCase(Locale.ROOT), active);
        positions.add(id);
        return id;
    }
}
