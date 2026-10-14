package com.hrmdemo.service.employee;

import java.util.Collection;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.entity.catalog.Catalog;
import com.hrmdemo.repository.employee.EmployeeSkillRepository;
import com.hrmdemo.service.catalog.CatalogReferences;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** A skill assigned to an Employee stays in the catalog; it may be deactivated but not deleted. */
@Component
@RequiredArgsConstructor
class EmployeeSkillReferences implements CatalogReferences {
    private final EmployeeSkillRepository skills;

    @Override
    public Catalog catalog() {
        return Catalog.SKILL;
    }

    @Override
    @Transactional(readOnly = true)
    public Set<UUID> referenced(Collection<UUID> itemIds) {
        return itemIds.isEmpty() ? Set.of() : skills.findReferencedSkillIds(itemIds);
    }
}
