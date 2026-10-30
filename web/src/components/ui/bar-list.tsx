// Library component "Bar list" (`hrm-bars`): one horizontal bar per category with the number beside it. The bar is a
// reading aid (hidden from assistive technology), the number is the data and is always shown. Bars are scaled to the
// largest value in the list, so the top row is full. `rich` gives a row a second line (code, overload) and a unit.
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

export type BarListRow = {
  key: string;
  label: string;
  value: number;
  /** The list already filtered to this category. */
  to?: string;
  /** `rich` only: the second line, e.g. the project code. */
  caption?: ReactNode;
  /** `rich` only: a warning after the caption, drawn in the danger colour ("1 quá tải"). */
  alert?: string;
};

export type BarListProps = {
  /** Names the chart for assistive technology ("Nhân viên theo đơn vị"). */
  label: string;
  /** Largest first; the consumer limits the list (at most 8 rows). */
  rows: BarListRow[];
  variant?: 'default' | 'rich';
  /** The shown number, with its unit ("9 người"). */
  format?: (value: number) => string;
  className?: string;
};

const link = 'rounded-sm hover:text-brand-blue hover:underline focus-visible:shadow-focus-ring';

export function BarList({ label, rows, variant = 'default', format = formatNumber, className }: BarListProps) {
  const rich = variant === 'rich';
  const largest = Math.max(0, ...rows.map((row) => row.value));
  return (
    <ul aria-label={label} className={cn('m-0 flex list-none flex-col p-0', className)}>
      {rows.map((row) => {
        const name = row.to ? (
          <Link to={row.to} className={cn(link, 'min-w-0 truncate', rich && 'text-[15px] leading-[22px] font-medium')}>
            {row.label}
          </Link>
        ) : (
          <span className={cn('min-w-0 truncate', rich && 'text-[15px] leading-[22px] font-medium')}>{row.label}</span>
        );
        return (
          <li
            key={row.key}
            className={cn(
              'grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-1 text-body-small md:min-h-8',
              rich ? 'md:grid-cols-[minmax(0,1fr)_160px_80px] md:py-2 not-last:border-b not-last:border-line' : 'md:grid-cols-[200px_minmax(0,1fr)_auto]',
            )}
          >
            {rich ? (
              <span className="flex min-w-0 flex-col">
                {name}
                {row.caption || row.alert ? (
                  <span className="text-caption text-ink-muted">
                    {row.caption}
                    {row.caption && row.alert ? ' · ' : null}
                    {row.alert ? <span className="text-danger">{row.alert}</span> : null}
                  </span>
                ) : null}
              </span>
            ) : (
              name
            )}
            <span aria-hidden="true" className={cn('col-span-full row-start-2 block overflow-hidden rounded-full bg-surface-muted md:col-span-1 md:row-start-auto', rich ? 'h-2.5' : 'h-3')}>
              <span className={cn('block h-full rounded-full bg-chart-1', row.value > 0 && 'min-w-1')} style={{ width: `${largest > 0 ? (row.value / largest) * 100 : 0}%` }} />
            </span>
            <span className={cn('min-w-10 text-right font-semibold tabular-nums', rich && 'md:min-w-20')}>{format(row.value)}</span>
          </li>
        );
      })}
    </ul>
  );
}
