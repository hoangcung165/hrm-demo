// A shift in a calendar cell: its code, a moon when it ends the next day, and a solid or dashed frame for a shift that
// was assigned to the person or comes from the default of their unit. The words are in the legend and read out here.
import { Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { CalendarShift, CellSource } from '../calendar-api';

export type ShiftMarkProps = {
  shift: Pick<CalendarShift, 'code' | 'name' | 'startTime' | 'endTime' | 'crossesMidnight'>;
  source: CellSource;
  /** The words are written next to the mark already: no title and no text for a screen reader. */
  quiet?: boolean;
  className?: string;
};

/** "Ca đêm, 22:00 – 06:00 hôm sau, đã phân ca": what a screen reader says for the mark. */
export function shiftMarkText(t: (key: string, values?: Record<string, string>) => string, shift: ShiftMarkProps['shift'], source: CellSource): string {
  const end = shift.crossesMidnight ? t('shiftCalendar.endsNextDay', { end: shift.endTime }) : shift.endTime;
  return `${shift.name}, ${shift.startTime} – ${end}, ${t(`shiftCalendar.source.${source}`)}`;
}

export function ShiftMark({ shift, source, quiet = false, className }: ShiftMarkProps) {
  const { t } = useTranslation();
  return (
    <span
      title={quiet ? undefined : shiftMarkText(t, shift, source)}
      className={cn(
        'inline-flex h-6 max-w-full min-w-0 items-center gap-1 rounded-sm border px-1.5 text-caption font-medium text-ink',
        source === 'ASSIGNED' ? 'border-solid border-ink-muted bg-brand-blue-soft' : 'border-dashed border-ink-muted',
        className,
      )}
    >
      {shift.crossesMidnight ? <Moon aria-hidden="true" className="size-3 shrink-0" /> : null}
      <span className="truncate">{shift.code}</span>
      {quiet ? null : <span className="sr-only">{shiftMarkText(t, shift, source)}</span>}
    </span>
  );
}
