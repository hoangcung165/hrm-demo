package com.hrmdemo;

import static org.assertj.core.api.Assertions.assertThat;

import com.hrmdemo.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/** Mẫu API integration test: ứng dụng khởi động với PostgreSQL thật và Flyway đã chạy. */
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
