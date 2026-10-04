package com.hrmdemo;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.Test;

/** Layer rules: controller → service → repository (ADR 0002). */
class LayerRulesTest {

    static final JavaClasses classes = new ClassFileImporter()
            .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
            .importPackages("com.hrmdemo");

    @Test
    void controllersDoNotUseRepositories() {
        noClasses().that().resideInAPackage("..controller..")
                .should().dependOnClassesThat().resideInAPackage("..repository..")
                .allowEmptyShould(true)
                .check(classes);
    }

    @Test
    void controllersDoNotExposeEntities() {
        noClasses().that().resideInAPackage("..controller..")
                .should().dependOnClassesThat().resideInAPackage("..entity..")
                .because("controllers speak DTOs only; services map entities")
                .allowEmptyShould(true)
                .check(classes);
    }

    @Test
    void repositoriesAreOnlyUsedByServices() {
        classes().that().resideInAPackage("..repository..")
                .should().onlyBeAccessed().byAnyPackage("..service..", "..repository..")
                .allowEmptyShould(true)
                .check(classes);
    }
}
