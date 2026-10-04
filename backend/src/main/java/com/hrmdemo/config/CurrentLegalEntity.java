package com.hrmdemo.config;

import java.util.Map;
import java.util.UUID;

import javax.sql.DataSource;

import org.hibernate.context.spi.CurrentTenantIdentifierResolver;
import org.springframework.boot.hibernate.autoconfigure.HibernatePropertiesCustomizer;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/**
 * The Pháp nhân (Legal entity) every request works in (ADR 0003). The demo has exactly one, created by the
 * Flyway migration, so its id is read once with plain JDBC and kept.
 * Hibernate asks this class for the value of {@code legal_entity_id} ("tenant id" in Hibernate's terms) when
 * it reads or writes a {@code LegalEntityOwned} entity. Multi-company would resolve the id per request here.
 */
@Component
public class CurrentLegalEntity implements CurrentTenantIdentifierResolver<UUID>, HibernatePropertiesCustomizer {

    /** Hibernate setting {@code MultiTenancySettings.MULTI_TENANT_IDENTIFIER_RESOLVER}. */
    private static final String RESOLVER_SETTING = "hibernate.tenant_identifier_resolver";

    private final JdbcClient jdbc;
    private volatile UUID id;

    public CurrentLegalEntity(DataSource dataSource) {
        this.jdbc = JdbcClient.create(dataSource);
    }

    /** Id of the Legal entity that owns the data of the current request. */
    public UUID id() {
        UUID current = id;
        if (current == null) {
            // Not in the constructor: Flyway may not have run yet when this bean is created.
            current = jdbc.sql("select id from legal_entity").query(UUID.class).single();
            id = current;
        }
        return current;
    }

    @Override
    public UUID resolveCurrentTenantIdentifier() {
        return id();
    }

    @Override
    public boolean validateExistingCurrentSessions() {
        return false;
    }

    @Override
    public void customize(Map<String, Object> hibernateProperties) {
        hibernateProperties.put(RESOLVER_SETTING, this);
    }
}
