package com.hrmdemo.dto.auth;

import java.util.Set;
import java.util.UUID;

public record MeResponse(UUID id, String email, Set<String> roles) {
}
