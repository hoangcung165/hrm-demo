package com.hrmdemo.repository.workschedule;

import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.entity.workschedule.WorkSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

/** The company's own Lịch làm việc; queries are filtered by Legal entity (ADR 0003). */
public interface WorkScheduleRepository extends JpaRepository<WorkSchedule, UUID> {

    Optional<WorkSchedule> findFirstBy();
}
