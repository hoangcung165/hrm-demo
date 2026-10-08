package com.hrmdemo.entity.auth;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Set;

/**
 * Demo personas: the fictional people behind the "Demo as…" switch, one per {@link Role} and named after it.
 * The names fit the example company (the Director is its legal representative). With the example data on, every
 * persona but the Admin is linked to the example Employee of the same name; name and title still live here, so
 * the switch works without Employees too.
 */
public enum DemoPersona {
    ADMIN("Đỗ Minh Quân", "Quản trị hệ thống", "demo.admin@hrm.local", Role.ADMIN),
    HR("Trần Thị Mai", "Trưởng phòng nhân sự", "demo.hr@hrm.local", Role.HR, Role.EMPLOYEE),
    LINE_MANAGER("Lê Văn Hùng", "Trưởng nhóm Web", "demo.line-manager@hrm.local", Role.LINE_MANAGER,
            Role.EMPLOYEE),
    PROJECT_MANAGER("Vũ Thị Lan", "Quản lý dự án", "demo.project-manager@hrm.local", Role.PROJECT_MANAGER,
            Role.EMPLOYEE),
    ACCOUNTANT("Hoàng Thị Thu", "Kế toán trưởng", "demo.accountant@hrm.local", Role.ACCOUNTANT, Role.EMPLOYEE),
    DIRECTOR("Phạm Quốc Bảo", "Giám đốc", "demo.director@hrm.local", Role.DIRECTOR, Role.EMPLOYEE),
    EMPLOYEE("Nguyễn Văn An", "Lập trình viên", "demo.employee@hrm.local", Role.EMPLOYEE);

    private final String fullName;
    private final String title;
    private final String email;
    private final Set<Role> roles;

    DemoPersona(String fullName, String title, String email, Role first, Role... more) {
        this.fullName = fullName;
        this.title = title;
        this.email = email;
        this.roles = Collections.unmodifiableSet(EnumSet.of(first, more));
    }

    public String fullName() {
        return fullName;
    }

    /** Job title shown next to the name. */
    public String title() {
        return title;
    }

    public String email() {
        return email;
    }

    /** The role the persona stands for, plus EMPLOYEE for everyone but the system Admin. */
    public Set<Role> roles() {
        return roles;
    }
}
