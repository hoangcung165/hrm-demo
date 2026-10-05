package com.hrmdemo.entity;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Text as it is stored and searched in a {@code search_text} column: lower case, without accents
 * (also {@code đ} → {@code d}), runs of whitespace as one space. The stored text and the search term go
 * through the same method, so "tran thi" finds "Trần Thị Mai" without a database extension.
 */
public final class SearchText {

    /** Combining marks left over after decomposition: tone marks, circumflex, breve, horn. */
    private static final Pattern MARKS = Pattern.compile("\\p{M}+");
    /** Unicode whitespace, including the no-break space that survives {@code trim()}. */
    private static final Pattern WHITESPACE = Pattern.compile("[\\s\\p{Z}]+");

    private SearchText() {
    }

    /** The parts joined by a space and normalized; null and blank parts are left out. */
    public static String of(String... parts) {
        StringBuilder joined = new StringBuilder();
        for (String part : parts) {
            if (part != null) {
                joined.append(part).append(' ');
            }
        }
        String lower = joined.toString().toLowerCase(Locale.ROOT);
        String withoutMarks = MARKS.matcher(Normalizer.normalize(lower, Normalizer.Form.NFD)).replaceAll("");
        // "đ" is a letter of its own, not "d" plus a mark, so decomposition leaves it as it is.
        return WHITESPACE.matcher(withoutMarks.replace('đ', 'd')).replaceAll(" ").trim();
    }

    /** A LIKE pattern that finds the normalized term anywhere; use it with {@code \} as the escape character. */
    public static String containsPattern(String term) {
        String escaped = of(term).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
        return "%" + escaped + "%";
    }
}
