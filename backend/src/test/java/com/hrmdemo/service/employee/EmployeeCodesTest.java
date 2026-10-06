package com.hrmdemo.service.employee;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.config.CurrentLegalEntity;
import com.hrmdemo.entity.employee.EmployeeCodeCounter;
import com.hrmdemo.repository.employee.EmployeeCodeCounterRepository;
import com.hrmdemo.repository.employee.EmployeeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Mã nhân viên: NV and at least five digits, issued from the locked counter, skipping codes already taken. */
@ExtendWith(MockitoExtension.class)
class EmployeeCodesTest {

    static final UUID LEGAL_ENTITY = UUID.fromString("00000000-0000-0000-0000-00000000001e");

    @Mock
    EmployeeCodeCounterRepository counters;
    @Mock
    EmployeeRepository employees;
    @Mock
    CurrentLegalEntity currentLegalEntity;

    EmployeeCodes codes;

    @BeforeEach
    void setUp() {
        codes = new EmployeeCodes(counters, employees, currentLegalEntity);
    }

    @Test
    void codesHaveAtLeastFiveDigits() {
        assertThat(EmployeeCodes.format(1)).isEqualTo("NV00001");
        assertThat(EmployeeCodes.format(99999)).isEqualTo("NV99999");
        assertThat(EmployeeCodes.format(100000)).isEqualTo("NV100000");
    }

    @Test
    void theNextCodeFollowsTheCounterWhichMovesToIt() {
        EmployeeCodeCounter counter = new EmployeeCodeCounter(LEGAL_ENTITY, 41);

        assertThat(codes.issue(counter)).isEqualTo("NV00042");
        assertThat(counter.getLastValue()).isEqualTo(42);
        assertThat(codes.issue(counter)).isEqualTo("NV00043");
    }

    @Test
    void codesAlreadyTakenAreSkipped() {
        Set<String> taken = Set.of("NV00042", "NV00043");
        when(employees.existsByCode(anyString())).thenAnswer(call -> taken.contains(call.<String>getArgument(0)));
        EmployeeCodeCounter counter = new EmployeeCodeCounter(LEGAL_ENTITY, 41);

        assertThat(codes.issue(counter)).isEqualTo("NV00044");
        assertThat(counter.getLastValue()).isEqualTo(44);
    }

    @Test
    void theCounterIsLockedAndCreatedFirstWhenTheLegalEntityHasNone() {
        when(currentLegalEntity.id()).thenReturn(LEGAL_ENTITY);
        EmployeeCodeCounter created = new EmployeeCodeCounter(LEGAL_ENTITY, 0);
        when(counters.findForUpdate(LEGAL_ENTITY)).thenReturn(Optional.empty(), Optional.of(created));

        assertThat(codes.lock()).isSameAs(created);
        InOrder order = inOrder(counters);
        order.verify(counters).findForUpdate(LEGAL_ENTITY);
        order.verify(counters).insertIfMissing(LEGAL_ENTITY);
        order.verify(counters).findForUpdate(LEGAL_ENTITY);
    }

    @Test
    void thePreviewReadsTheCounterWithoutMovingIt() {
        when(currentLegalEntity.id()).thenReturn(LEGAL_ENTITY);
        EmployeeCodeCounter counter = new EmployeeCodeCounter(LEGAL_ENTITY, 193);
        when(counters.findById(LEGAL_ENTITY)).thenReturn(Optional.of(counter));

        assertThat(codes.preview()).isEqualTo("NV00194");
        assertThat(counter.getLastValue()).isEqualTo(193);
    }
}
