package com.hrmdemo.service.accessscope;

import java.util.Set;
import java.util.UUID;

/**
 * What the Access scope needs to know about the org structure. Implemented by the org unit feature;
 * a port, because the org unit service itself depends on the Access scope.
 */
@FunctionalInterface
public interface ManagedOrgUnits {

    /**
     * The Organization units the Employee heads (Trưởng đơn vị) and every unit below them, active or not.
     * Empty when the Employee heads no unit.
     */
    Set<UUID> unitIdsManagedBy(UUID employeeId);
}
