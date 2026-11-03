// One cell of the grid: a button that opens the dialog for that person and day, showing what is entered. A day without
// a shift, or after today, takes no entry and says why.
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { ManualCell as Cell } from '../manual-model';

export type ManualCellProps = { cell: Cell; label: string; onOpen: () => void };

export function ManualCell({ cell, label, onOpen }: ManualCellProps) {
  const { t } = useTranslation();
  if (cell.state === 'noShift' || cell.state === 'future') {
    // A quiet dash keeps the grid readable; the reason is read out and shown on hover.
    return (
      <span className="block text-center text-ink-muted" title={t(`attendanceManual.cell.${cell.state}`)}>
        <span aria-hidden="true">–</span>
        <span className="sr-only">{t(`attendanceManual.cell.${cell.state}`)}</span>
      </span>
    );
  }
  const text = cell.state === 'entry' ? (cell.entry.kind === 'TIMES' ? `${cell.entry.in}–${cell.entry.out}` : t(`attendanceManual.kind.${cell.entry.kind}`)) : '+';
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${label}: ${cell.state === 'entry' ? text : t('attendanceManual.cell.empty')}`}
      title={cell.state === 'entry' && cell.entry.note ? cell.entry.note : undefined}
      className={cn(
        'flex h-10 w-full items-center justify-center rounded-sm border text-body-small tabular-nums focus-visible:shadow-focus-ring focus-visible:outline-none',
        cell.state === 'entry'
          ? cell.entry.kind === 'ABSENT'
            ? 'border-line bg-surface font-medium text-danger hover:bg-surface-muted'
            : 'border-transparent bg-brand-blue-soft font-medium text-brand-blue hover:border-brand-blue'
          : 'border-dashed border-line bg-surface text-ink-muted hover:border-brand-blue hover:text-brand-blue',
      )}
    >
      {text}
    </button>
  );
}
