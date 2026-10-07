// Shared by the Table rows and the compact rows: a row that opens its record on click.
import type { MouseEvent } from 'react';

/** Runs `open` for a click on the row itself: not on a control inside it, and not at the end of selecting its text. */
export function rowClicked(event: MouseEvent<HTMLElement>, open: () => void) {
  if (event.target instanceof Element && event.target.closest('a, button, input, select, textarea, label, [role="menuitem"]')) return;
  if (window.getSelection()?.toString()) return;
  open();
}
