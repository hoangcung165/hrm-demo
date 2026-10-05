package com.hrmdemo.repository.accessscope;

import java.util.UUID;

import com.hrmdemo.entity.accessscope.RolePermissionOverride;
import org.springframework.data.jpa.repository.JpaRepository;

/** A company has at most a few dozen rows, so they are read and replaced as a whole. */
public interface RolePermissionOverrideRepository extends JpaRepository<RolePermissionOverride, UUID> {
}
