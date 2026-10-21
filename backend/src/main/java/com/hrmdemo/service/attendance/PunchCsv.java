package com.hrmdemo.service.attendance;

import java.util.ArrayList;
import java.util.List;

/**
 * Reads CSV text into rows of cells. The delimiter is the one of {@code , ; tab} that the header line uses most;
 * a cell may be quoted with {@code "}, with {@code ""} for a quote inside, and may then hold the delimiter and line
 * breaks. A blank line is a record of one empty cell, so row numbers match the file. Pure, no I/O.
 */
final class PunchCsv {

    private PunchCsv() {
    }

    static List<List<String>> parse(String text) {
        String body = text.startsWith("﻿") ? text.substring(1) : text;
        char delimiter = delimiterOf(body);
        List<List<String>> rows = new ArrayList<>();
        List<String> row = new ArrayList<>();
        StringBuilder cell = new StringBuilder();
        boolean quoted = false;
        boolean wasQuoted = false;
        for (int i = 0; i < body.length(); i++) {
            char c = body.charAt(i);
            if (quoted) {
                if (c == '"') {
                    if (i + 1 < body.length() && body.charAt(i + 1) == '"') {
                        cell.append('"');
                        i++;
                    } else {
                        quoted = false;
                    }
                } else {
                    cell.append(c);
                }
            } else if (c == '"' && cell.toString().isBlank()) {
                cell.setLength(0);
                quoted = true;
                wasQuoted = true;
            } else if (c == delimiter) {
                row.add(finish(cell, wasQuoted));
                wasQuoted = false;
            } else if (c == '\n' || c == '\r') {
                if (c == '\r' && i + 1 < body.length() && body.charAt(i + 1) == '\n') {
                    i++;
                }
                row.add(finish(cell, wasQuoted));
                wasQuoted = false;
                add(rows, row);
                row = new ArrayList<>();
            } else {
                cell.append(c);
            }
        }
        row.add(finish(cell, wasQuoted));
        if (row.size() > 1 || !row.getFirst().isEmpty()) {
            add(rows, row);
        }
        return rows;
    }

    private static String finish(StringBuilder cell, boolean wasQuoted) {
        String value = wasQuoted ? cell.toString() : cell.toString().strip();
        cell.setLength(0);
        return value;
    }

    /** Every record is kept, a blank line too, so the row number of a record is its place in the file. */
    private static void add(List<List<String>> rows, List<String> row) {
        rows.add(row);
    }

    /** The delimiter that splits the first line into the most cells; a comma when none does. */
    private static char delimiterOf(String body) {
        int end = 0;
        while (end < body.length() && body.charAt(end) != '\n' && body.charAt(end) != '\r') {
            end++;
        }
        String header = body.substring(0, end);
        char best = ',';
        int bestCount = 0;
        for (char candidate : new char[] {',', ';', '\t'}) {
            int count = (int) header.chars().filter(c -> c == candidate).count();
            if (count > bestCount) {
                best = candidate;
                bestCount = count;
            }
        }
        return best;
    }
}
