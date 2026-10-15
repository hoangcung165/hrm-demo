package com.hrmdemo.service.employee;

import com.hrmdemo.exception.ApiException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/** LibreOffice headless conversion uses installed Vietnamese Unicode fonts. */
@Component
public class ContractPdfConverter {
    public byte[] convert(byte[] docx) {
        Path dir = null;
        try {
            dir = Files.createTempDirectory("contract-export-");
            Path input = dir.resolve("contract.docx");
            Path pdf = dir.resolve("contract.pdf");
            Files.write(input,docx);
            Process process = new ProcessBuilder("libreoffice","-env:UserInstallation=file://"+dir.resolve("profile"),
                    "--headless","--convert-to","pdf:writer_pdf_Export","--outdir",dir.toString(),
                    input.toString()).redirectErrorStream(true).start();
            boolean complete = process.waitFor(30,TimeUnit.SECONDS);
            if (!complete) process.destroyForcibly();
            if (!complete || process.exitValue() != 0 || !Files.isRegularFile(pdf)) {
                throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                        "contract_export.pdf_unavailable","PDF conversion failed");
            }
            return Files.readAllBytes(pdf);
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "contract_export.pdf_unavailable","PDF conversion is unavailable");
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "contract_export.pdf_interrupted","PDF conversion interrupted");
        } finally {
            if (dir != null) {
                try (var walk = Files.walk(dir)) {
                    walk.sorted(java.util.Comparator.reverseOrder()).forEach(p -> {
                        try { Files.deleteIfExists(p); } catch (IOException ignored) { }
                    });
                } catch (IOException ignored) { }
            }
        }
    }
}
