// A time in an inbox row: the date, and the time of day underneath.
import { formatDate, formatTime } from '@/lib/format';

export type ApprovalSentAtCellProps = { at: string };

export function ApprovalSentAtCell({ at }: ApprovalSentAtCellProps) {
  return (
    <span className="flex flex-col tabular-nums">
      {formatDate(at)}
      <span className="text-caption text-ink-muted">{formatTime(at)}</span>
    </span>
  );
}
