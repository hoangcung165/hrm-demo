package com.hrmdemo.repository.profileupdate;

import java.util.UUID;

import com.hrmdemo.entity.profileupdate.ProfileUpdateRequest;
import org.springframework.data.jpa.repository.JpaRepository;

/** Cập nhật hồ sơ content; filtered by Legal entity (ADR 0003). */
public interface ProfileUpdateRequestRepository extends JpaRepository<ProfileUpdateRequest, UUID> {
}
