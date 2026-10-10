package com.hrmdemo.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Background jobs ({@code @Scheduled}), such as the Tự duyệt of approval requests. On by default; the test profile
 * turns it off so integration tests run a job only when they call it.
 */
@Configuration(proxyBeanMethods = false)
@EnableScheduling
@ConditionalOnProperty(name = "hrm.scheduling.enabled", havingValue = "true", matchIfMissing = true)
public class SchedulingConfig {
}
