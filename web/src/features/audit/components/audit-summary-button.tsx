// A record in the list: its summary is the button that opens the before → after drawer, so keyboard and screen reader
// users reach it with Tab and open it with Enter; the drawer gives focus back to it on Esc.
export type AuditSummaryButtonProps = {
  /** The record; marks the button so focus can find its way back to it. */
  recordId: string;
  summary: string;
  /** Second line in compact rows: the kind of record and who changed it. */
  caption?: string;
  onOpen: () => void;
};

export function AuditSummaryButton({ recordId, summary, caption, onOpen }: AuditSummaryButtonProps) {
  return (
    <span className="flex min-w-0 flex-col">
      <button
        type="button"
        data-audit-record={recordId}
        aria-haspopup="dialog"
        onClick={onOpen}
        className="cursor-pointer truncate rounded-sm text-left font-medium text-ink hover:text-brand-blue hover:underline focus-visible:shadow-focus-ring focus-visible:outline-none"
      >
        {summary}
      </button>
      {caption ? <span className="truncate text-caption font-normal text-ink-muted">{caption}</span> : null}
    </span>
  );
}
