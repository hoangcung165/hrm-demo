package com.hrmdemo.entity.orgunit;

/** Kind of Organization unit. A label only: any type may sit under any other. */
public enum OrgUnitType {
    /** Chi nhánh: a dependent branch (shares the company's tax code). */
    BRANCH,
    /** Phòng ban. */
    DEPARTMENT,
    /** Nhóm / tổ. */
    TEAM
}
