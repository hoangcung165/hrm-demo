package com.hrmdemo.repository.shift;

import java.util.List;
import java.util.UUID;

import com.hrmdemo.entity.shift.Shift;
import org.springframework.data.jpa.repository.JpaRepository;

/** Ca làm việc of the company; queries are filtered by Legal entity (ADR 0003). */
public interface ShiftRepository extends JpaRepository<Shift, UUID> {

    List<Shift> findAllByOrderByStartTimeAscNameAsc();

    List<Shift> findAllByActiveOrderByStartTimeAscNameAsc(boolean active);

    boolean existsByCodeIgnoreCase(String code);
}
