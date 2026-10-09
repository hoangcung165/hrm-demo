package com.hrmdemo.service.employee;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.IntStream;

import com.hrmdemo.config.CurrentLegalEntity;
import com.hrmdemo.entity.employee.EmployeeCodeCounter;
import com.hrmdemo.repository.employee.EmployeeCodeCounterRepository;
import com.hrmdemo.repository.employee.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Issues Mã nhân viên: {@code NV} and at least five digits ({@code NV00001} … {@code NV99999}, then
 * {@code NV100000}). Codes are never reused. The counter row of the Legal entity is locked for the rest of the
 * create transaction, so concurrent creates queue on it; codes already taken (e.g. brought in by an import) are
 * skipped. The unique index on the code is the last guard.
 */
@Component
@RequiredArgsConstructor
class EmployeeCodes {

    static final String PREFIX = "NV";

    private final EmployeeCodeCounterRepository counters;
    private final EmployeeRepository employees;
    private final CurrentLegalEntity currentLegalEntity;

    static String format(int value) {
        return PREFIX + String.format("%05d", value);
    }

    /** Locks the counter until the transaction ends; creates it first when the Legal entity has none yet. */
    EmployeeCodeCounter lock() {
        UUID legalEntityId = currentLegalEntity.id();
        return counters.findForUpdate(legalEntityId).orElseGet(() -> {
            counters.insertIfMissing(legalEntityId);
            return counters.findForUpdate(legalEntityId).orElseThrow();
        });
    }

    /** The next free code after the counter, which moves to it. Call it with the counter from {@link #lock()}. */
    String issue(EmployeeCodeCounter counter) {
        int value = nextFree(counter.getLastValue());
        counter.issued(value);
        return format(value);
    }

    /**
     * The next {@code count} free codes after the counter, in order, which moves past the last one: for an import.
     * Taken codes are found with one query per window of candidates, not one per code. Call it with the counter
     * from {@link #lock()}.
     */
    List<String> issue(EmployeeCodeCounter counter, int count) {
        List<String> issued = new ArrayList<>(count);
        int next = counter.getLastValue() + 1;
        while (issued.size() < count) {
            List<String> candidates = IntStream.range(next, next + count - issued.size())
                    .mapToObj(EmployeeCodes::format)
                    .toList();
            Set<String> taken = employees.findCodesIn(candidates);
            for (String candidate : candidates) {
                if (!taken.contains(candidate)) {
                    issued.add(candidate);
                }
            }
            next += candidates.size();
        }
        if (count > 0) {
            counter.issued(next - 1);
        }
        return issued;
    }

    /** The code the next create would get, without taking the lock: another create may take it first. */
    String preview() {
        int last = counters.findById(currentLegalEntity.id()).map(EmployeeCodeCounter::getLastValue).orElse(0);
        return format(nextFree(last));
    }

    private int nextFree(int last) {
        int value = last + 1;
        while (employees.existsByCode(format(value))) {
            value++;
        }
        return value;
    }
}
