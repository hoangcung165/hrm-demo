// Library component "Day breakdown list" (design #18): how a span of days counts, one row per run of days (when,
// what kind of day, its value), non-working rows muted at 0, the total on top. Used by the leave request form.
import { cn } from '@/lib/utils';

export type DayBreakdownRow = {
  key: string;
  /** "T6 30/10", or a run "31/10 – 01/11". */
  when: string;
  /** "Buổi chiều", "Cuối tuần", "Ngày Văn hóa Việt Nam (lễ)". */
  label: string;
  /** Formatted: "0,5". */
  value: string;
  /** A day that does not count (weekend, holiday). */
  muted?: boolean;
};

export type DayBreakdownProps = {
  /** "Số ngày nghỉ". */
  title: string;
  /** Formatted with its unit: "2,5 ngày". */
  total: string;
  /** Over the limit: the total in danger. */
  invalid?: boolean;
  rows: DayBreakdownRow[];
  /** Waiting for the count: the rows stay, the list is busy. */
  busy?: boolean;
  className?: string;
};

export function DayBreakdown({ title, total, invalid = false, rows, busy = false, className }: DayBreakdownProps) {
  return (
    <section aria-label={title} aria-busy={busy || undefined} className={cn('flex flex-col gap-2 rounded-md border border-line bg-surface p-4', className)}>
      <div className="flex items-baseline gap-2">
        <h3 className="flex-1 text-body-strong">{title}</h3>
        <span aria-live="polite" className={cn('text-heading tabular-nums', invalid ? 'text-danger' : 'text-ink')}>
          {total}
        </span>
      </div>
      {rows.length ? (
        <ul className="flex flex-col">
          {rows.map((row) => (
            <li key={row.key} className={cn('grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_auto] gap-3 border-t border-line py-2 text-body-small', row.muted && 'text-ink-muted')}>
              <span className="tabular-nums">{row.when}</span>
              <span className="min-w-0 [overflow-wrap:anywhere]">{row.label}</span>
              <span className="text-right tabular-nums">{row.value}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
