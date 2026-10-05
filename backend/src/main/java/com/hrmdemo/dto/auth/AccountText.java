package com.hrmdemo.dto.auth;

import java.util.Locale;

/** Limits and clean-up shared by the requests that write an Account. */
final class AccountText {

    static final int FULL_NAME_MAX = 100;
    static final int EMAIL_MAX = 254;

    private AccountText() {
    }

    static String trim(String value) {
        return value == null ? null : value.trim();
    }

    /** Emails are stored and compared trimmed and in lower case (as sign-in does). */
    static String email(String value) {
        return value == null ? null : value.trim().toLowerCase(Locale.ROOT);
    }
}
