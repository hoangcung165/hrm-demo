// "Tuần / Tháng": the two views of the calendar.
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { CalendarView } from '../calendar-model';

export type ShiftCalendarViewSwitchProps = { view: CalendarView; onChange: (view: CalendarView) => void };

export function ShiftCalendarViewSwitch({ view, onChange }: ShiftCalendarViewSwitchProps) {
  const { t } = useTranslation();
  return (
    <div role="group" aria-label={t('shiftCalendar.view')} className="inline-flex rounded-sm border border-line bg-surface p-0.5">
      {(['WEEK', 'MONTH'] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={view === value}
          onClick={() => onChange(value)}
          className={cn('h-9 min-w-20 cursor-pointer rounded-sm px-3 text-body hover:bg-surface-muted md:h-8', view === value && 'bg-brand-blue-soft font-medium text-brand-blue hover:bg-brand-blue-soft')}
        >
          {t(`shiftCalendar.view${value === 'WEEK' ? 'Week' : 'Month'}`)}
        </button>
      ))}
    </div>
  );
}
