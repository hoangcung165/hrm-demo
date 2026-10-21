// The header of one day column: weekday and date as a button that opens the day, with the marks of the day in words
// (the holiday, the weekly day off, a half working day) and the mark of today.
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { CalendarDay } from '../calendar-api';

export type ShiftCalendarHeadProps = { date: Date; iso: string; day: CalendarDay | undefined; today: boolean; open: boolean; onOpen: (iso: string) => void };

export function ShiftCalendarHead({ date, iso, day, today, open, onOpen }: ShiftCalendarHeadProps) {
  const { t } = useTranslation();
  const holiday = day?.holiday ?? null;
  const off = day?.dayKind === 'OFF';
  const half = day?.dayKind === 'MORNING';
  const note = holiday ? t('shiftCalendar.holidayShort') : half ? t('shiftCalendar.halfShort') : null;
  const spoken = [holiday ? t('shiftCalendar.holidayNamed', { name: holiday }) : off ? t('shiftCalendar.dayOff') : half ? t('shiftCalendar.halfDay') : null, today ? t('shiftCalendar.today') : null].filter(Boolean).join(', ');
  return (
    <th
      scope="col"
      aria-current={today ? 'date' : undefined}
      className={cn('w-14 min-w-14 border-b border-line p-0 text-center text-caption font-normal text-ink-muted', holiday || off ? 'bg-surface-muted' : 'bg-surface', today && 'border-b-2 border-b-brand-blue text-ink')}
    >
      <button
        type="button"
        aria-pressed={open}
        onClick={() => onOpen(iso)}
        className={cn('flex w-full cursor-pointer flex-col items-center gap-0.5 px-1 py-2 hover:bg-brand-blue-soft focus-visible:shadow-focus-ring', open && 'bg-brand-blue-soft')}
      >
        <span>{t(`leave.weekday.short.${date.getDay()}`)}</span>
        <span className={cn('tabular-nums', today ? 'font-semibold text-ink' : 'text-body-strong text-ink')}>{date.getDate()}</span>
        {note ? <span className="text-caption font-medium text-ink">{note}</span> : null}
        {spoken ? <span className="sr-only">{`, ${spoken}`}</span> : null}
      </button>
    </th>
  );
}
