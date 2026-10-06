package com.hrmdemo.support;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

/**
 * Full-app integration test with Testcontainers PostgreSQL (or the database in {@code HRM_TEST_DB_URL}).
 * Call the API via {@code MockMvcTester}; name classes {@code *IT}.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, TestAccounts.class, TestEmployees.class})
@ActiveProfiles("test")
public @interface IntegrationTest {
}
