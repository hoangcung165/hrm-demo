package com.hrmdemo.support;

import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Shared PostgreSQL container for all integration tests.
 * Opt-out for machines that cannot pull images: set {@code HRM_TEST_DB_URL} (plus {@code HRM_TEST_DB_USER} /
 * {@code HRM_TEST_DB_PASSWORD}) to run against an existing, empty PostgreSQL database instead; see
 * {@code application-test.yml}.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

    @Bean
    @ServiceConnection
    @ConditionalOnExpression("'${HRM_TEST_DB_URL:}'.isEmpty()")
    PostgreSQLContainer postgresContainer() {
        return new PostgreSQLContainer(DockerImageName.parse("postgres:16-alpine"));
    }
}
