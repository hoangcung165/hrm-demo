package com.hrmdemo.service.exampledata;

import static org.assertj.core.api.Assertions.assertThat;

import com.hrmdemo.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;

/** Example data is opt-in: without {@code hrm.example-data.enabled} the seeder is not even a bean. */
@IntegrationTest
class ExampleDataDisabledIT {

    @Autowired
    ApplicationContext context;

    @Test
    void theSeederDoesNotExistUnlessExampleDataIsTurnedOn() {
        assertThat(context.getBeanNamesForType(ExampleDataSeeder.class)).isEmpty();
    }
}
