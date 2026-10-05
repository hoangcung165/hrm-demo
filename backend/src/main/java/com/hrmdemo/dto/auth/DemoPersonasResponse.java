package com.hrmdemo.dto.auth;

import java.util.List;

/**
 * The demo personas of the "Demo as…" switch, one per role, in role order.
 */
public record DemoPersonasResponse(List<Persona> personas) {

    /**
     * @param persona   persona key: the name of the role it stands for
     * @param title     job title shown next to the name
     * @param roles     the roles the persona's Account holds
     * @param available false when the persona's Account is missing or locked: it cannot be signed in as
     */
    public record Persona(String persona, String fullName, String title, List<String> roles, boolean available) {
    }
}
