package com.hrmdemo;

import static org.assertj.core.api.Assertions.assertThat;

import com.hrmdemo.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/** Sample API integration test: app boots on real PostgreSQL with Flyway applied. */
@IntegrationTest
class HealthApiIT {

    @Autowired
    MockMvcTester mvc;

    @Test
    void healthIsUp() {
        assertThat(mvc.get().uri("/actuator/health"))
                .hasStatusOk()
                .bodyJson().extractingPath("$.status").isEqualTo("UP");
    }
}
