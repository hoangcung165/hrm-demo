package com.hrmdemo.service.legalentity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;

import javax.sql.DataSource;

import com.hrmdemo.config.CurrentLegalEntity;
import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.repository.auth.AccountRepository;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import com.hrmdemo.support.TestAccounts.TestAccount;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** One Pháp nhân, and every root table filtered by it in one place (ADR 0003). */
@IntegrationTest
class LegalEntityIT {

    @Autowired
    DataSource dataSource;
    @Autowired
    PlatformTransactionManager transactionManager;
    @Autowired
    CurrentLegalEntity currentLegalEntity;
    @Autowired
    AccountRepository accounts;
    @Autowired
    TestAccounts testAccounts;

    JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
    }

    @Test
    void installationCreatesExactlyOneLegalEntity() {
        assertThat(jdbc.queryForObject("select count(*) from legal_entity", Long.class)).isEqualTo(1);
        assertThat(currentLegalEntity.id()).isEqualTo(jdbc.queryForObject("select id from legal_entity", UUID.class));
    }

    @Test
    void theDatabaseRefusesASecondLegalEntity() {
        assertThatThrownBy(() -> insertLegalEntity(UUID.randomUUID())).isInstanceOf(DuplicateKeyException.class);

        assertThat(jdbc.queryForObject("select count(*) from legal_entity", Long.class)).isEqualTo(1);
    }

    @Test
    void aNewAccountGetsTheLegalEntityWithoutTheCodeSettingIt() {
        TestAccount account = testAccounts.create(Role.EMPLOYEE);

        assertThat(jdbc.queryForObject("select legal_entity_id from account where id = ?", UUID.class, account.id()))
                .isEqualTo(currentLegalEntity.id());
        assertThat(accounts.findById(account.id()).orElseThrow().getLegalEntityId())
                .isEqualTo(currentLegalEntity.id());
    }

    @Test
    void anAccountOfAnotherLegalEntityIsInvisibleThroughTheRepository() {
        // A second Legal entity can only exist without the single-row index. DDL is transactional in PostgreSQL,
        // so everything here is rolled back.
        var transaction = new TransactionTemplate(transactionManager);
        transaction.executeWithoutResult(status -> {
            status.setRollbackOnly();
            UUID otherLegalEntity = UUID.randomUUID();
            UUID foreignAccount = UUID.randomUUID();
            String foreignEmail = "foreign-" + foreignAccount + "@hrm.test";
            jdbc.execute("drop index uq_legal_entity_single");
            insertLegalEntity(otherLegalEntity);
            jdbc.update("""
                    insert into account (id, email, full_name, search_text, password_hash, status, created_at,
                                         legal_entity_id)
                    values (?, ?, 'Foreign', 'foreign', 'x', 'ACTIVE', now(), ?)""",
                    foreignAccount, foreignEmail, otherLegalEntity);
            long allRows = jdbc.queryForObject("select count(*) from account", Long.class);

            assertThat(jdbc.queryForObject("select count(*) from account where id = ?", Long.class, foreignAccount))
                    .as("the row is really there").isEqualTo(1);
            assertThat(accounts.findById(foreignAccount)).as("load by id").isEmpty();
            assertThat(accounts.findByEmail(foreignEmail)).as("derived query").isEmpty();
            assertThat(accounts.findAll()).as("find all").extracting(Account::getId).doesNotContain(foreignAccount);
            assertThat(accounts.count()).as("count").isEqualTo(allRows - 1);
        });

        assertThat(jdbc.queryForObject("select count(*) from legal_entity", Long.class)).isEqualTo(1);
    }

    private void insertLegalEntity(UUID id) {
        jdbc.update("insert into legal_entity (id, name, created_at, updated_at) values (?, 'Another', now(), now())",
                id);
    }
}
