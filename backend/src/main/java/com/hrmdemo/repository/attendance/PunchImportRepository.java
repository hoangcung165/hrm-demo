package com.hrmdemo.repository.attendance;

import java.util.UUID;

import com.hrmdemo.entity.attendance.PunchImport;
import org.springframework.data.jpa.repository.JpaRepository;

/** Imports of punch log files of the company. */
public interface PunchImportRepository extends JpaRepository<PunchImport, UUID> {
}
