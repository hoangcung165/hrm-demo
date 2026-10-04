package com.hrmdemo.dto.legalentity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Company info as edited by the Admin. Text is trimmed and blank optional fields become null before validation.
 *
 * @param taxCode Vietnamese tax code: 10 digits, or 10 digits + "-" + 3 digits for a dependent unit
 */
public record CompanyInfoRequest(
        @NotBlank @Size(max = 200) String name,
        @Pattern(regexp = "\\d{10}(-\\d{3})?") String taxCode,
        @Size(max = 500) String address,
        @Size(max = 100) String legalRepresentativeName,
        @Size(max = 100) String legalRepresentativeTitle) {

    public CompanyInfoRequest {
        name = name == null ? null : name.trim();
        taxCode = blankToNull(taxCode);
        address = blankToNull(address);
        legalRepresentativeName = blankToNull(legalRepresentativeName);
        legalRepresentativeTitle = blankToNull(legalRepresentativeTitle);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
