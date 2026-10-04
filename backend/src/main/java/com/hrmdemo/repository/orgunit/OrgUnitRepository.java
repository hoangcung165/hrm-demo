package com.hrmdemo.repository.orgunit;

import java.util.UUID;

import com.hrmdemo.entity.orgunit.OrgUnit;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * A company has at most a few hundred units, so the service loads them all ({@code findAll}, filtered by
 * Legal entity like every {@code LegalEntityOwned} entity) and works on the tree in memory.
 */
public interface OrgUnitRepository extends JpaRepository<OrgUnit, UUID> {
}
