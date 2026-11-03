package com.hrmdemo.repository.attendance;

import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.entity.attendance.MobileCheckinSetting;
import org.springframework.data.jpa.repository.JpaRepository;

/** The company's own rules of mobile check-in; queries are filtered by Legal entity (ADR 0003). */
public interface MobileCheckinSettingRepository extends JpaRepository<MobileCheckinSetting, UUID> {

    Optional<MobileCheckinSetting> findFirstBy();
}
