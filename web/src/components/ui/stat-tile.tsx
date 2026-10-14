// Library component "Stat tile" (`hrm-stat`): one headline number with its label and an optional hint. With `to` the
// whole tile is a link (a number that leads to the list behind it). A missing value shows an en dash, never a zero.
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Skeleton } from './skeleton';
import { cn } from '@/lib/utils';

export type StatTileProps = {
  label: string;
  /** The number, already formatted ("75%"). `null` when there is nothing to average. */
  value: ReactNode | null;
  /** One short line under the number: what it counts or where it comes from. */
  hint?: string;
  /** Makes the tile a link. */
  to?: string;
  /** Loading: a Skeleton instead of the number. */
  busy?: boolean;
  /** Warm accent for a number that needs attention (Quá tải). */
  tone?: 'default' | 'danger';
  className?: string;
};

export function StatTile({ label, value, hint, to, busy = false, tone = 'default', className }: StatTileProps) {
  const body = (
    <>
      <span className="text-body-small text-ink-muted">{label}</span>
      {busy ? <Skeleton shape="title" className="w-16" /> : <span className={cn('text-[28px] leading-9 font-semibold tabular-nums', tone === 'danger' ? 'text-danger' : 'text-ink')}>{value ?? '–'}</span>}
      {hint ? <span className="text-caption text-ink-muted">{hint}</span> : null}
    </>
  );
  const frame = cn('flex min-w-0 flex-col gap-1 rounded-md border border-line bg-surface p-4', className);
  return to ? (
    <Link to={to} className={cn(frame, 'rounded-md hover:bg-surface-muted focus-visible:shadow-focus-ring')}>
      {body}
    </Link>
  ) : (
    <div className={frame}>{body}</div>
  );
}
