package com.hrmdemo.service.project;

import java.util.Collection;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.entity.catalog.Catalog;
import com.hrmdemo.repository.project.ProjectAllocationRepository;
import com.hrmdemo.service.catalog.CatalogReferences;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** A Vai trò dự án held by any Phân bổ, ended ones included, is in use and cannot be deleted. */
@Component
@RequiredArgsConstructor
class AllocationProjectRoleReferences implements CatalogReferences {

    private final ProjectAllocationRepository allocations;

    @Override
    public Catalog catalog() {
        return Catalog.PROJECT_ROLE;
    }

    @Override
    @Transactional(readOnly = true)
    public Set<UUID> referenced(Collection<UUID> itemIds) {
        return itemIds.isEmpty() ? Set.of() : allocations.findProjectRoleIdsIn(itemIds);
    }
}
