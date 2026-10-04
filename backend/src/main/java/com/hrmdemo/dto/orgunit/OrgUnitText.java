package com.hrmdemo.dto.orgunit;

import java.util.Locale;

/** Normalises request text before validation. */
final class OrgUnitText {

    static final String CODE_PATTERN = "[A-Z0-9-]{2,10}";
    static final String TYPE_PATTERN = "BRANCH|DEPARTMENT|TEAM";
    static final int NAME_MAX = 150;

    private OrgUnitText() {
    }

    static String trim(String value) {
        return value == null ? null : value.trim();
    }

    /** Codes are case-insensitive and stored in upper case. */
    static String code(String value) {
        return value == null ? null : value.trim().toUpperCase(Locale.ROOT);
    }
}
