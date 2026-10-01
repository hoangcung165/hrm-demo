package com.hrmdemo;

import com.hrmdemo.support.TestcontainersConfiguration;
import org.springframework.boot.SpringApplication;

/** Chạy ứng dụng với PostgreSQL trong container, không cần docker compose. */
public class TestHrmApplication {

    public static void main(String[] args) {
        SpringApplication.from(HrmApplication::main).with(TestcontainersConfiguration.class).run(args);
    }
}
