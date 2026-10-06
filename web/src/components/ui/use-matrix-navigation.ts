// Keyboard model of the editable matrix (Table README, "Editable matrix"): one cell in the tab order (roving
// focus), arrow keys between the cells of the yes / no rows, Home / End to the first or last cell of the row,
// Ctrl+Home / Ctrl+End to the first or last cell of the matrix. Space on a box toggles it (the native checkbox);
// locked cells take focus too, so their reason is read.
import { useState, type FocusEvent, type KeyboardEvent } from 'react';

/** Spread on the focusable element of a cell: its box, or the cell itself when it cannot be changed. */
export type MatrixCellFocus = { 'data-matrix-cell': string; tabIndex: number; onFocus: (event: FocusEvent<HTMLElement>) => void };

const keyOf = (row: number, column: number) => `${row}:${column}`;

/** `rows` × `columns` cells; put `onKeyDown` on their table and `focusOf(row, column)` on each cell. */
export function useMatrixNavigation(rows: number, columns: number) {
  const [active, setActive] = useState({ row: 0, column: 0 });
  // The tab stop survives rows or columns going away (a reload) by falling back to the first cell.
  const stop = active.row < rows && active.column < columns ? active : { row: 0, column: 0 };

  const focusOf = (row: number, column: number): MatrixCellFocus => ({
    'data-matrix-cell': keyOf(row, column),
    tabIndex: row === stop.row && column === stop.column ? 0 : -1,
    onFocus: () => setActive({ row, column }),
  });

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-matrix-cell]');
    if (!cell || rows === 0 || columns === 0) return;
    const [row = 0, column = 0] = (cell.dataset.matrixCell ?? '').split(':').map(Number);
    const ctrl = event.ctrlKey || event.metaKey;
    const to: Record<string, [number, number]> = {
      ArrowRight: [row, Math.min(column + 1, columns - 1)],
      ArrowLeft: [row, Math.max(column - 1, 0)],
      ArrowDown: [Math.min(row + 1, rows - 1), column],
      ArrowUp: [Math.max(row - 1, 0), column],
      Home: ctrl ? [0, 0] : [row, 0],
      End: ctrl ? [rows - 1, columns - 1] : [row, columns - 1],
    };
    const next = to[event.key];
    if (!next) return;
    // Also keeps the arrows from scrolling the container: the focused cell brings itself into view.
    event.preventDefault();
    const target = event.currentTarget.querySelector<HTMLElement>(`[data-matrix-cell="${keyOf(next[0], next[1])}"]`);
    target?.focus();
  };

  return { focusOf, onKeyDown };
}
