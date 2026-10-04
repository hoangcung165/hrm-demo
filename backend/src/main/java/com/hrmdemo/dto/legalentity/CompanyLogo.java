package com.hrmdemo.dto.legalentity;

/**
 * The company logo as served to browsers.
 *
 * @param version changes with every upload; it is the {@code v} parameter of the logo URL
 */
public record CompanyLogo(byte[] content, String contentType, long version) {
}
