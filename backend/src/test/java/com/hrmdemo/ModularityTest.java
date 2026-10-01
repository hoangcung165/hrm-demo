package com.hrmdemo;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;
import org.springframework.modulith.docs.Documenter;

/** Kiểm ranh giới giữa các context (ADR 0002): module khác chỉ được dùng package gốc của module. */
class ModularityTest {

    static final ApplicationModules modules = ApplicationModules.of(HrmApplication.class);

    @Test
    void contextsRespectModuleBoundaries() {
        modules.verify();
    }

    @Test
    void writeModuleDocumentation() {
        new Documenter(modules).writeModulesAsPlantUml();
    }
}
