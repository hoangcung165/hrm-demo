// Scroll arithmetic of the library component "Org chart", one axis at a time. Pure, so it is tested without layout.

/** One axis of the viewport: its scroll position, its visible size, and where the chart starts inside the scrolled content. */
export type ScrollAxis = { scroll: number; client: number; offset: number };

/**
 * Scroll position after a zoom by `ratio` (new zoom / old zoom) that keeps the point at the centre of the viewport
 * at the centre. With the chart starting at the content edge this is `(scroll + client / 2) × ratio − client / 2`;
 * `before.offset` and `offsetAfter` account for the padding and for a chart that is centred while narrower than the viewport.
 */
export function anchoredScroll(before: ScrollAxis, ratio: number, offsetAfter = before.offset): number {
  return (before.scroll + before.client / 2 - before.offset) * ratio + offsetAfter - before.client / 2;
}

/**
 * How far to scroll one axis so that a card comes to the middle of the frame; 0 when the card is fully in view on
 * that axis, so the other axis is never moved for it.
 */
export function revealShift(card: { start: number; end: number }, frame: { start: number; end: number }): number {
  if (card.start >= frame.start && card.end <= frame.end) return 0;
  return (card.start + card.end - frame.start - frame.end) / 2;
}
