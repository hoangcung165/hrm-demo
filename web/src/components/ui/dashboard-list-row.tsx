// One row of a Dashboard widget list: lead (an Avatar for a person, or an icon mark for a thing), main (title, usually a
// link to the record, and a sub line, both on one line with ellipsis) and end (a short value with an optional sub line,
// or a Badge).
import type { ReactNode } from 'react';

export type DashboardListRowProps = {
  /** An Avatar 32 for a person, or `DashboardIconMark`. */
  lead: ReactNode;
  /** The record's name; a link when there is a record to open. */
  title: ReactNode;
  sub?: string;
  /** A short value ("Phép năm") or a Badge. */
  end?: ReactNode;
  /** Under the end value ("cả ngày, đến 16/10"). */
  endSub?: string;
};

export function DashboardListRow({ lead, title, sub, end, endSub }: DashboardListRowProps) {
  return (
    <li className="flex min-h-14 items-center gap-3 border-b border-line py-2 last:border-b-0">
      {lead}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body-strong [&_a]:rounded-sm [&_a:hover]:text-brand-blue [&_a:hover]:underline [&_a:focus-visible]:shadow-focus-ring">{title}</span>
        {sub ? <span className="truncate text-caption text-ink-muted">{sub}</span> : null}
      </span>
      {end || endSub ? (
        <span className="flex max-w-[45%] shrink-0 flex-col items-end text-right text-body-small">
          {end}
          {endSub ? <span className="text-caption text-ink-muted">{endSub}</span> : null}
        </span>
      ) : null}
    </li>
  );
}
