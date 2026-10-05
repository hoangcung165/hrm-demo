package com.hrmdemo.entity.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Arrays;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

/** The demo personas as agreed with Design: one per role, with fixed names, titles, emails and roles. */
class DemoPersonaTest {

    @Test
    void thereIsOnePersonaPerRoleNamedAfterItInRoleOrder() {
        assertThat(Arrays.stream(DemoPersona.values()).map(DemoPersona::name).toList())
                .containsExactlyElementsOf(Arrays.stream(Role.values()).map(Role::name).toList());
    }

    @Test
    void thePersonasCarryTheAgreedNamesTitlesAndEmails() {
        assertThat(Arrays.stream(DemoPersona.values())
                .map(persona -> persona.fullName() + " | " + persona.title() + " | " + persona.email()).toList())
                .containsExactly(
                        "Đỗ Minh Quân | Quản trị hệ thống | demo.admin@hrm.local",
                        "Trần Thị Mai | Trưởng phòng nhân sự | demo.hr@hrm.local",
                        "Lê Văn Hùng | Trưởng nhóm Web | demo.line-manager@hrm.local",
                        "Vũ Thị Lan | Quản lý dự án | demo.project-manager@hrm.local",
                        "Hoàng Thị Thu | Kế toán trưởng | demo.accountant@hrm.local",
                        "Phạm Quốc Bảo | Giám đốc | demo.director@hrm.local",
                        "Nguyễn Văn An | Lập trình viên | demo.employee@hrm.local");
    }

    @ParameterizedTest
    @EnumSource(DemoPersona.class)
    void aPersonaHoldsItsRoleAndEveryoneButTheAdminIsAlsoAnEmployee(DemoPersona persona) {
        Role own = Role.valueOf(persona.name());

        if (persona == DemoPersona.ADMIN) {
            assertThat(persona.roles()).containsExactly(Role.ADMIN);
        } else {
            assertThat(persona.roles()).containsExactlyInAnyOrder(own, Role.EMPLOYEE);
        }
    }

    @Test
    void aPersonaAccountTakesNameEmailRolesAndSearchTextFromThePersona() {
        Account account = Account.forDemoPersona(DemoPersona.HR, "hash", Instant.parse("2026-10-05T08:00:00Z"));

        assertThat(account.isDemoPersona()).isTrue();
        assertThat(account.getDemoPersona()).isEqualTo(DemoPersona.HR);
        assertThat(account.getFullName()).isEqualTo("Trần Thị Mai");
        assertThat(account.getEmail()).isEqualTo("demo.hr@hrm.local");
        assertThat(account.getSearchText()).isEqualTo("tran thi mai demo.hr@hrm.local");
        assertThat(account.roleNames()).containsExactlyInAnyOrder("HR", "EMPLOYEE");
        assertThat(account.isActive()).isTrue();
        assertThat(new Account("a@hrm.test", "A", "hash", Instant.EPOCH).isDemoPersona()).isFalse();
    }
}
