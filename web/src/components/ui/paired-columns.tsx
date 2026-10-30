// Library component "Paired columns" (`hrm-pairs`): two series side by side for each period, both numbers printed
// under it. Series A is always the left bar (chart-3), series B the right one (chart-4), so the two are told apart by
// position and by the printed numbers, never by colour alone. Each period reads as one sentence for assistive
// technology; hover or keyboard focus on a period opens a tooltip with the full period.
import { useState } from 'react';
import { cn } from '@/lib/utils';

export type PairedPeriod = {
  key: string;
  /** "T10" */
  short: string;
  /** "Tháng 10/2026" */
  full: string;
  a: number;
  b: number;
  current?: boolean;
  /** The sentence a screen reader gets for this period ("Tháng 10/2026: 3 vào làm, 1 nghỉ việc"). */
  sentence: string;
};

export type PairedColumnsProps = {
  /** Names the chart, the period and the totals ("Vào làm và nghỉ việc theo tháng, 6 tháng gần nhất: tổng 27 vào làm, 7 nghỉ việc"). */
  label: string;
  periods: PairedPeriod[];
  seriesA: string;
  seriesB: string;
  className?: string;
};

const MINUS = '−';
const bar = 'w-3.5 rounded-t-[3px] md:w-[18px]';

export function PairedColumns({ label, periods, seriesA, seriesB, className }: PairedColumnsProps) {
  const [active, setActive] = useState<string | null>(null);
  const largest = Math.max(0, ...periods.flatMap((period) => [period.a, period.b]));
  const height = (value: number) => `${largest > 0 ? (value / largest) * 100 : 0}%`;
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <ol aria-label={label} className="m-0 grid list-none p-0" style={{ gridTemplateColumns: `repeat(${periods.length}, minmax(0, 1fr))` }}>
        {periods.map((period, index) => {
          const open = active === period.key;
          return (
            <li
              key={period.key}
              tabIndex={0}
              onMouseEnter={() => setActive(period.key)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(period.key)}
              onBlur={() => setActive(null)}
              className={cn('relative flex flex-col items-center gap-0.5 rounded-sm pb-1 focus-visible:shadow-focus-ring', open && 'bg-surface-muted')}
            >
              {open ? (
                <span aria-hidden="true" className={cn('pointer-events-none absolute top-0 z-10 flex flex-col gap-0.5 rounded-sm border border-line bg-surface px-3 py-2 text-caption whitespace-nowrap shadow-lg', index >= periods.length - 2 ? 'right-[calc(100%+4px)]' : 'left-[calc(100%+4px)]')}>
                  <span className="font-semibold">{period.full}</span>
                  <span className="flex items-center gap-2 tabular-nums">
                    <span className="size-2 rounded-full bg-chart-3" />
                    {seriesA}
                    <b className="ml-auto pl-3">{period.a}</b>
                  </span>
                  <span className="flex items-center gap-2 tabular-nums">
                    <span className="size-2 rounded-full bg-chart-4" />
                    {seriesB}
                    <b className="ml-auto pl-3">{period.b}</b>
                  </span>
                </span>
              ) : null}
              <span aria-hidden="true" className="mb-1 flex h-22 w-full items-end justify-center gap-1 border-b border-line md:h-28">
                <span className={cn(bar, 'bg-chart-3', period.a > 0 && 'min-h-0.5')} style={{ height: height(period.a) }} />
                <span className={cn(bar, 'bg-chart-4', period.b > 0 && 'min-h-0.5')} style={{ height: height(period.b) }} />
              </span>
              <span aria-hidden="true" className={cn('text-caption font-medium tabular-nums', period.current ? 'font-semibold text-brand-blue' : 'text-ink')}>
                {period.short}
              </span>
              <span aria-hidden="true" className="text-caption whitespace-nowrap tabular-nums text-ink-muted">
                +{period.a} {MINUS}{period.b}
              </span>
              <span className="sr-only">{period.sentence}</span>
            </li>
          );
        })}
      </ol>
      <ul aria-hidden="true" className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-caption font-medium text-ink-muted">
        <li className="inline-flex items-center gap-1">
          <span className="size-3 rounded-[3px] bg-chart-3" />
          {seriesA}
        </li>
        <li className="inline-flex items-center gap-1">
          <span className="size-3 rounded-[3px] bg-chart-4" />
          {seriesB}
        </li>
      </ul>
    </div>
  );
}
