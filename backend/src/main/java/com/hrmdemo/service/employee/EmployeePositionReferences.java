package com.hrmdemo.service.employee;

import java.util.Collection;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.entity.catalog.Catalog;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.service.catalog.CatalogReferences;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** A Chức danh held by any Employee, Inactive ones included, is in use and cannot be deleted. */
@Component
@RequiredArgsConstructor
class EmployeePositionReferences implements CatalogReferences {

    private final EmployeeRepository employees;

    @Override
    public Catalog catalog() {
        return Catalog.POSITION;
    }

    @Override
    @Transactional(readOnly = true)
    public Set<UUID> referenced(Collection<UUID> itemIds) {
        return itemIds.isEmpty() ? Set.of() : employees.findPositionIdsIn(itemIds);
    }
}
