package com.hrmdemo.dto.employee;

/** Independent warning milestones; a formal contract can also have a probation clause. */
public enum ExpiryType {
    CONTRACT("contracts"), PROBATION("contracts"), VISA("documents"),
    WORK_PERMIT("documents"), CERTIFICATE("skills");

    private final String profileTab;

    ExpiryType(String profileTab) {
        this.profileTab = profileTab;
    }

    public String profileTab() { return profileTab; }
}
