package com.hrmdemo.service.employee;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Arrays;
import java.util.Locale;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import com.hrmdemo.exception.ApiException;
import org.springframework.http.HttpStatus;

/** Validate the filename, size and actual file signature before storing private attachments. */
public final class EmployeeAttachmentChecks {
    public static final int MAX_BYTES = 5 * 1024 * 1024;
    private static final Map<String, String> TYPES = Map.of(
            "pdf", "application/pdf", "png", "image/png", "jpg", "image/jpeg",
            "jpeg", "image/jpeg", "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    public record Checked(String fileName, String contentType) {}
    private EmployeeAttachmentChecks() {}

    public static Checked validate(String name, String suppliedType, byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "attachment.file_missing", "No file supplied");
        }
        if (bytes.length > MAX_BYTES) throw tooLarge();
        String safe = safeName(name);
        String extension = safe.substring(safe.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        String expected = TYPES.get(extension);
        if (expected == null || !matches(extension, bytes)) throw unsupported();
        String type = suppliedType == null ? "" : suppliedType.split(";", 2)[0].strip().toLowerCase(Locale.ROOT);
        if (!type.isEmpty() && !type.equals("application/octet-stream") && !type.equals(expected)) {
            throw unsupported();
        }
        return new Checked(safe, expected);
    }

    public static String safeName(String name) {
        if (name == null || name.isBlank() || name.length() > 180 || name.startsWith(".")
                || name.endsWith(".") || name.contains("..") || name.indexOf('/') >= 0
                || name.indexOf(92) >= 0 || name.indexOf('.') < 0) {
            throw invalidName();
        }
        for (int i = 0; i < name.length(); i++) {
            char c = name.charAt(i);
            if (Character.isISOControl(c) || (c >= 0x202A && c <= 0x202E)
                    || (c >= 0x2066 && c <= 0x2069)) throw invalidName();
        }
        return name.strip();
    }

    private static boolean matches(String extension, byte[] bytes) {
        return switch (extension) {
            case "pdf" -> starts(bytes, new byte[]{37, 80, 68, 70, 45});
            case "png" -> starts(bytes, new byte[]{(byte) 137, 80, 78, 71, 13, 10, 26, 10});
            case "jpg", "jpeg" -> starts(bytes, new byte[]{(byte) 255, (byte) 216, (byte) 255});
            case "docx", "xlsx" -> validOfficeZip(bytes,
                    extension.equals("docx") ? "word/document.xml" : "xl/workbook.xml");
            default -> false;
        };
    }

    private static boolean starts(byte[] bytes, byte[] signature) {
        return bytes.length >= signature.length
                && Arrays.equals(bytes, 0, signature.length, signature, 0, signature.length);
    }

    private static boolean validOfficeZip(byte[] bytes, String requiredEntry) {
        if (!starts(bytes, new byte[]{80, 75, 3, 4})) return false;
        boolean found = false;
        int count = 0;
        long total = 0;
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            ZipEntry entry;
            byte[] buffer = new byte[8192];
            while ((entry = zip.getNextEntry()) != null) {
                if (++count > 1024) return false;
                if (requiredEntry.equals(entry.getName())) found = true;
                int read;
                while ((read = zip.read(buffer)) != -1) {
                    total += read;
                    if (total > 4L * MAX_BYTES) return false;
                }
                zip.closeEntry();
            }
        } catch (IOException | RuntimeException ex) {
            return false;
        }
        return found;
    }

    public static ApiException tooLarge() {
        return new ApiException(HttpStatus.valueOf(413), "attachment.file_too_large", "File exceeds 5 MiB");
    }
    private static ApiException invalidName() {
        return new ApiException(HttpStatus.BAD_REQUEST, "attachment.invalid_name", "Invalid filename");
    }
    private static ApiException unsupported() {
        return new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "attachment.unsupported_type", "Unsupported or invalid file format");
    }
}
