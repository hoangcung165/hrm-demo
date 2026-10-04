package com.hrmdemo.service.legalentity;

import java.nio.charset.StandardCharsets;

/** Smallest byte sequences that carry each format's signature; enough for the type check, not real pictures. */
public final class SampleImages {

    public static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D};
    public static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10, 'J', 'F', 'I', 'F'};
    public static final byte[] WEBP = "RIFF\u0010\0\0\0WEBPVP8 ".getBytes(StandardCharsets.ISO_8859_1);
    public static final byte[] SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>"
            .getBytes(StandardCharsets.UTF_8);

    private SampleImages() {
    }

    /** PNG signature followed by zeros, {@code size} bytes in total. */
    public static byte[] pngOfSize(int size) {
        byte[] content = new byte[size];
        System.arraycopy(PNG, 0, content, 0, PNG.length);
        return content;
    }
}
