package com.hrmdemo;

import com.hrmdemo.support.TestcontainersConfiguration;
import org.springframework.boot.SpringApplication;

/** Runs the app against a containerized PostgreSQL; no docker compose needed. */
public class TestHrmApplication {

    public static void main(String[] args) {
        SpringApplication.from(HrmApplication::main).with(TestcontainersConfiguration.class).run(args);
    }
}
