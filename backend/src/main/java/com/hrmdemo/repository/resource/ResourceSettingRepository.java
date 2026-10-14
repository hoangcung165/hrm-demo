package com.hrmdemo.repository.resource;

import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.entity.resource.ResourceSetting;
import org.springframework.data.jpa.repository.JpaRepository;

/** The company's own resource thresholds; queries are filtered by Legal entity (ADR 0003). */
public interface ResourceSettingRepository extends JpaRepository<ResourceSetting, UUID> {

    Optional<ResourceSetting> findFirstBy();
}
