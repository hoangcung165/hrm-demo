package com.hrmdemo.service.attendance;

import java.util.Map;

/**
 * One data row of a punch log file as text: its row number in the file (the header is row 1) and the cells of the
 * columns found. A cell that is blank is missing from the map.
 */
record PunchRawRow(int row, Map<PunchColumn, String> cells) {

    String cell(PunchColumn column) {
        return cells.get(column);
    }
}
