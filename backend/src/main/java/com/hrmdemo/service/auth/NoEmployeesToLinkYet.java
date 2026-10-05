package com.hrmdemo.service.auth;

import java.util.UUID;

import org.springframework.stereotype.Component;

/**
 * Stand-in until Employees exist (HRM-06): no id is an Employee, so an Account cannot be linked to one.
 * HRM-06 deletes this class when it adds the real bean.
 */
@Component
class NoEmployeesToLinkYet implements AccountEmployees {

    @Override
    public boolean isActiveEmployee(UUID employeeId) {
        return false;
    }
}
