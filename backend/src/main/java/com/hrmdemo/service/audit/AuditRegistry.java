package com.hrmdemo.service.audit;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Component;

/** The audited types of the application, collected from the {@link AuditedType} beans of {@link AuditRegistrations}. */
@Component
public class AuditRegistry {

    private final Map<String, AuditedType> types = new LinkedHashMap<>();

    public AuditRegistry(List<AuditedType> registered) {
        for (AuditedType type : registered) {
            if (types.putIfAbsent(type.key(), type) != null) {
                throw new IllegalStateException("Audited type registered twice: " + type.key());
            }
        }
    }

    public Optional<AuditedType> find(String key) {
        return Optional.ofNullable(types.get(key));
    }

    /** All registered types, in registration order. */
    public List<AuditedType> all() {
        return List.copyOf(types.values());
    }
}
