package com.hrmdemo.dto.employee;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class ContractStateTest {
    private static final LocalDate TODAY = LocalDate.of(2026, 11, 1);

    @Test
    void aTermIsInclusiveOnBothDates() {
        assertThat(ContractState.of(TODAY, TODAY.plusDays(90), TODAY)).isEqualTo(ContractState.CURRENT);
        assertThat(ContractState.of(TODAY.plusDays(1), null, TODAY)).isEqualTo(ContractState.UPCOMING);
        assertThat(ContractState.of(TODAY.minusDays(90), TODAY, TODAY)).isEqualTo(ContractState.EXPIRING);
        assertThat(ContractState.of(TODAY.minusDays(90), TODAY.minusDays(1), TODAY)).isEqualTo(ContractState.ENDED);
    }

    @Test
    void expiringMeansThirtyDaysOrLess() {
        assertThat(ContractState.of(TODAY.minusDays(90), TODAY.plusDays(30), TODAY)).isEqualTo(ContractState.EXPIRING);
        assertThat(ContractState.of(TODAY.minusDays(90), TODAY.plusDays(31), TODAY)).isEqualTo(ContractState.CURRENT);
    }

    @Test
    void anOpenEndedContractIsCurrentOnceItStarts() {
        assertThat(ContractState.of(TODAY.minusDays(5), null, TODAY)).isEqualTo(ContractState.CURRENT);
    }

    @Test
    void daysRemainingOnlyForRunningDatedContracts() {
        assertThat(ContractState.daysRemaining(ContractState.EXPIRING, TODAY.plusDays(12), TODAY)).isEqualTo(12);
        assertThat(ContractState.daysRemaining(ContractState.CURRENT, TODAY.plusDays(200), TODAY)).isEqualTo(200);
        assertThat(ContractState.daysRemaining(ContractState.CURRENT, null, TODAY)).isNull();
        assertThat(ContractState.daysRemaining(ContractState.UPCOMING, TODAY.plusDays(90), TODAY)).isNull();
        assertThat(ContractState.daysRemaining(ContractState.ENDED, TODAY.minusDays(3), TODAY)).isNull();
    }
}
