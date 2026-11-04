// Library component "Check-in card" (HRM-39, proposed on the main canvas row `#39`, not yet in the HRM design system):
// the Chấm công hôm nay card of the Employee's home. Title with a status Badge, the day's lines (shift, punches), one
// full-width action and a note under it. A busy card shows Skeletons in place of the lines and the action.
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

export type CheckinCardProps = {
  /** Rendered as an `h2`: "Chấm công hôm nay". */
  title: string;
  /** Beside the title: the day's status Badge ("Chưa chấm công", "Đã vào"). */
  status?: ReactNode;
  /** The day's lines: the shift, the punches, an Alert. */
  children?: ReactNode;
  /** One Button or Link, full width and 48px high: "Chấm công vào". */
  action?: ReactNode;
  /** Under the action, in caption size: what a check-in needs. */
  note?: ReactNode;
  /** Loading: `aria-busy` and Skeletons for the lines and the action. */
  busy?: boolean;
  className?: string;
};

export function CheckinCard({ title, status, children, action, note, busy = false, className }: CheckinCardProps) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} aria-busy={busy || undefined} className={cn('flex flex-col gap-3 rounded-md border border-line bg-surface p-4', className)}>
      <div className="flex items-start gap-2">
        <h2 id={titleId} className="min-w-0 flex-1 text-body-strong font-semibold">{title}</h2>
        {busy ? null : status}
      </div>
      {busy ? (
        <>
          <Skeleton className="w-48" />
          <Skeleton shape="control" className="h-12 w-full rounded-md" />
        </>
      ) : (
        <>
          {children}
          {action ? <div className="flex flex-col [&>*]:h-12 [&>*]:w-full [&>*]:text-body-strong">{action}</div> : null}
          {note ? <p className="text-caption text-ink-muted">{note}</p> : null}
        </>
      )}
    </section>
  );
}
