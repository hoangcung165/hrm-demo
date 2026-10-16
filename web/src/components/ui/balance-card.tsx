// Library component "Leave balance card" (`hrm-balance`, design #18): an icon tile, the type and its rule, the
// remaining figure in large type, one stacked bar (used, pending, remaining, advance room) and its legend with the
// numbers. A negative balance shows the figure in danger; the consumer adds the warning under it.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** `used` ink-muted, `pending` warning, `remaining` brand-teal, `room` an outlined box (what may still be advanced). */
export type BalanceTone = 'used' | 'pending' | 'remaining' | 'room';

export type BalanceSegment = {
  tone: BalanceTone;
  /** The width of the bar part, in days; zero or less draws nothing. */
  value: number;
  /** The legend line with its number: "Đã dùng 4". */
  text: string;
};

export type BalanceCardProps = {
  icon: ReactNode;
  /** "Phép năm 2026". */
  title: string;
  /** The rule: "Định mức 12 ngày · cộng 1 ngày mỗi tháng". */
  caption?: string;
  /** The remaining days, formatted: "4,5" or "−1,5". */
  figure: string;
  /** Under the figure: "ngày còn lại". */
  figureLabel: string;
  negative?: boolean;
  segments: BalanceSegment[];
  /** The whole bar read out: "Phép năm 2026: đã dùng 4, đang chờ 1,5, còn lại 4,5, có thể ứng thêm 2 ngày". */
  barLabel: string;
  /** Lines under the legend: accrued to date, Phép tồn, a warning. */
  children?: ReactNode;
  className?: string;
};

const BAR: Record<BalanceTone, string> = {
  used: 'bg-ink-muted',
  pending: 'bg-warning',
  remaining: 'bg-brand-teal',
  room: 'border border-line bg-surface',
};

const SWATCH: Record<BalanceTone, string> = {
  used: 'bg-ink-muted',
  pending: 'bg-warning',
  remaining: 'bg-brand-teal',
  room: 'border border-ink-muted',
};

export function BalanceCard({ icon, title, caption, figure, figureLabel, negative = false, segments, barLabel, children, className }: BalanceCardProps) {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  return (
    <section aria-label={title} className={cn('flex min-w-0 flex-col gap-3 rounded-md border border-line bg-surface p-4 md:p-6', className)}>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-teal-soft text-success [&_svg]:size-5 [&_svg]:stroke-[1.5]">
          {icon}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="text-body-strong">{title}</h2>
          {caption ? <span className="text-caption text-ink-muted">{caption}</span> : null}
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className={cn('text-display tabular-nums', negative ? 'text-danger' : 'text-ink')}>{figure}</span>
          <span className="text-caption text-ink-muted">{figureLabel}</span>
        </div>
      </div>
      <span role="img" aria-label={barLabel} className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-surface-muted">
        {total > 0
          ? segments
              .filter((segment) => segment.value > 0)
              .map((segment) => <span key={segment.tone} className={BAR[segment.tone]} style={{ width: `${(segment.value / total) * 100}%` }} />)
          : null}
      </span>
      <ul aria-hidden="true" className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-ink-muted">
        {segments.map((segment) => (
          <li key={segment.tone} className="inline-flex items-center gap-1">
            <span className={cn('size-2.5 rounded-[2px]', SWATCH[segment.tone])} />
            <span className="tabular-nums">{segment.text}</span>
          </li>
        ))}
      </ul>
      {children}
    </section>
  );
}
