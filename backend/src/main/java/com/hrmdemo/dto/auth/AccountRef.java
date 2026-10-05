package com.hrmdemo.dto.auth;

import java.util.UUID;

/** Just enough of an Account to name it, e.g. the holder of an email in the {@code account.email_taken} error. */
public record AccountRef(UUID id, String fullName) {
}
