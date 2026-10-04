package com.hrmdemo.service.legalentity;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;

class LogoImageTypeTest {

    @Test
    void recognisesPngJpegAndWebpByTheirFirstBytes() {
        assertThat(LogoImageType.detect(SampleImages.PNG)).contains(LogoImageType.PNG);
        assertThat(LogoImageType.detect(SampleImages.JPEG)).contains(LogoImageType.JPEG);
        assertThat(LogoImageType.detect(SampleImages.WEBP)).contains(LogoImageType.WEBP);
        assertThat(LogoImageType.PNG.contentType()).isEqualTo("image/png");
        assertThat(LogoImageType.JPEG.contentType()).isEqualTo("image/jpeg");
        assertThat(LogoImageType.WEBP.contentType()).isEqualTo("image/webp");
    }

    @Test
    void rejectsSvgGifOtherRiffFilesAndTruncatedContent() {
        assertThat(LogoImageType.detect(SampleImages.SVG)).isEmpty();
        assertThat(LogoImageType.detect("GIF89a-and-more".getBytes(StandardCharsets.US_ASCII))).isEmpty();
        assertThat(LogoImageType.detect("RIFF\0\0\0\0WAVEfmt ".getBytes(StandardCharsets.US_ASCII))).isEmpty();
        assertThat(LogoImageType.detect("RIFF\0\0".getBytes(StandardCharsets.US_ASCII))).isEmpty();
        assertThat(LogoImageType.detect(new byte[] {(byte) 0x89, 'P', 'N'})).isEmpty();
        assertThat(LogoImageType.detect(new byte[0])).isEmpty();
    }
}
