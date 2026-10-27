package com.hrmdemo.repository.attendance;

import java.time.Instant;
import java.util.UUID;

import com.hrmdemo.entity.attendance.PunchImport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/** Imports of punch log files of the company. */
public interface PunchImportRepository extends JpaRepository<PunchImport, UUID> {

    /** When the Log quẹt thẻ was last imported, or null when it never was. */
    @Query("select max(i.createdAt) from PunchImport i")
    Instant latestImportAt();
}
