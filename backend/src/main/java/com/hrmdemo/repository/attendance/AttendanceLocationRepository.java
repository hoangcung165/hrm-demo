package com.hrmdemo.repository.attendance;

import java.util.List;
import java.util.UUID;

import com.hrmdemo.entity.attendance.AttendanceLocation;
import org.springframework.data.jpa.repository.JpaRepository;

/** Địa điểm chấm công of the company; queries are filtered by Legal entity (ADR 0003). */
public interface AttendanceLocationRepository extends JpaRepository<AttendanceLocation, UUID> {

    List<AttendanceLocation> findAllByOrderByNameAsc();

    List<AttendanceLocation> findAllByActiveOrderByNameAsc(boolean active);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id);
}
