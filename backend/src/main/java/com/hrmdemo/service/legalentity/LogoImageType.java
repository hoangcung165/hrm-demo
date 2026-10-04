package com.hrmdemo.service.legalentity;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

/**
 * Image formats accepted for the company logo, recognised by their first bytes. The file name and the declared
 * content type are not trusted. SVG is not accepted: it can carry scripts.
 */
public enum LogoImageType {
    PNG("image/png"),
    JPEG("image/jpeg"),
    WEBP("image/webp");

    private static final byte[] PNG_SIGNATURE = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] JPEG_SIGNATURE = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] RIFF = "RIFF".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] WEBP_TAG = "WEBP".getBytes(StandardCharsets.US_ASCII);

    private final String contentType;

    LogoImageType(String contentType) {
        this.contentType = contentType;
    }

    public String contentType() {
        return contentType;
    }

    public static Optional<LogoImageType> detect(byte[] content) {
        if (startsWith(content, 0, PNG_SIGNATURE)) {
            return Optional.of(PNG);
        }
        if (startsWith(content, 0, JPEG_SIGNATURE)) {
            return Optional.of(JPEG);
        }
        // RIFF container: "RIFF", 4 bytes of length, then the format tag.
        if (startsWith(content, 0, RIFF) && startsWith(content, 8, WEBP_TAG)) {
            return Optional.of(WEBP);
        }
        return Optional.empty();
    }

    private static boolean startsWith(byte[] content, int offset, byte[] signature) {
        if (content.length < offset + signature.length) {
            return false;
        }
        for (int i = 0; i < signature.length; i++) {
            if (content[offset + i] != signature[i]) {
                return false;
            }
        }
        return true;
    }
}
