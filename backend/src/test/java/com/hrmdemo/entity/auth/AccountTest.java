package com.hrmdemo.entity.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;

import org.junit.jupiter.api.Test;

/** The search text of an Account follows its full name and email. */
class AccountTest {

    static final Instant NOW = Instant.parse("2026-10-05T08:00:00Z");

    @Test
    void aNewAccountIsSearchableByItsFullNameAndEmailWithoutAccents() {
        Account account = new Account("mai.tran@hrm.test", "Trần Thị Mai", "hash", NOW);

        assertThat(account.getFullName()).isEqualTo("Trần Thị Mai");
        assertThat(account.getSearchText()).isEqualTo("tran thi mai mai.tran@hrm.test");
    }

    @Test
    void renamingAnAccountUpdatesItsSearchText() {
        Account account = new Account("mai.tran@hrm.test", "Trần Thị Mai", "hash", NOW);

        account.rename("Đỗ Thị Mai");

        assertThat(account.getFullName()).isEqualTo("Đỗ Thị Mai");
        assertThat(account.getSearchText()).isEqualTo("do thi mai mai.tran@hrm.test");
    }

    @Test
    void changingTheEmailUpdatesItsSearchText() {
        Account account = new Account("mai.tran@hrm.test", "Trần Thị Mai", "hash", NOW);

        account.changeEmail("mai.do@hrm.test");

        assertThat(account.getEmail()).isEqualTo("mai.do@hrm.test");
        assertThat(account.getSearchText()).isEqualTo("tran thi mai mai.do@hrm.test");
    }
}
