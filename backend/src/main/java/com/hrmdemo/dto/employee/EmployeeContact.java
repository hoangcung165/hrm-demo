package com.hrmdemo.dto.employee;

/** The contact fields of an Employee's profile, as stored (normalized); any of them may be null. */
public record EmployeeContact(String personalEmail, String phone, String address, String emergencyContactName,
        String emergencyContactRelationship, String emergencyContactPhone) {

    public String get(ContactField field) {
        return switch (field) {
            case PERSONAL_EMAIL -> personalEmail;
            case PHONE -> phone;
            case ADDRESS -> address;
            case EMERGENCY_CONTACT_NAME -> emergencyContactName;
            case EMERGENCY_CONTACT_RELATIONSHIP -> emergencyContactRelationship;
            case EMERGENCY_CONTACT_PHONE -> emergencyContactPhone;
        };
    }

    public EmployeeContact with(ContactField field, String value) {
        return new EmployeeContact(
                field == ContactField.PERSONAL_EMAIL ? value : personalEmail,
                field == ContactField.PHONE ? value : phone,
                field == ContactField.ADDRESS ? value : address,
                field == ContactField.EMERGENCY_CONTACT_NAME ? value : emergencyContactName,
                field == ContactField.EMERGENCY_CONTACT_RELATIONSHIP ? value : emergencyContactRelationship,
                field == ContactField.EMERGENCY_CONTACT_PHONE ? value : emergencyContactPhone);
    }
}
