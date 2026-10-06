package com.hrmdemo.service.employee;

/** Masking of the identity numbers (P8) for a caller who may not see them. */
final class SensitiveNumbers {

    static final char MASK = '•';
    static final int VISIBLE_DIGITS = 4;

    private SensitiveNumbers() {
    }

    /** Every character but the last four as {@link #MASK}, so the length stays; null stays null. */
    static String mask(String number) {
        if (number == null) {
            return null;
        }
        int hidden = Math.max(0, number.length() - VISIBLE_DIGITS);
        return String.valueOf(MASK).repeat(hidden) + number.substring(hidden);
    }
}
