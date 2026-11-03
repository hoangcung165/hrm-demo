package com.hrmdemo.repository.attendance;

import java.util.UUID;

import com.hrmdemo.entity.attendance.PunchPhoto;
import org.springframework.data.jpa.repository.JpaRepository;

/** Photos of mobile Lần quẹt, by punch id; queries are filtered by Legal entity (ADR 0003). */
public interface PunchPhotoRepository extends JpaRepository<PunchPhoto, UUID> {
}
