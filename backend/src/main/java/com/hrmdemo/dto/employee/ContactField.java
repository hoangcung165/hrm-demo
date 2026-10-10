package com.hrmdemo.dto.employee;

/**
 * The contact fields of a profile an Employee changes through a Yêu cầu phê duyệt of type "Cập nhật hồ sơ"
 * (HRM-12). Dependents and skills join when HRM-08 and HRM-09 add them.
 */
public enum ContactField {
    PERSONAL_EMAIL,
    PHONE,
    ADDRESS,
    EMERGENCY_CONTACT_NAME,
    EMERGENCY_CONTACT_RELATIONSHIP,
    EMERGENCY_CONTACT_PHONE
}
