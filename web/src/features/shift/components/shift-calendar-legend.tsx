// What the marks mean: an assigned shift (solid frame), the default shift of the unit (dashed frame), a shift that ends
// the next day (moon), today, and the days off and holidays.
import { Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function ShiftCalendarLegend() {
  const { t } = useTranslation();
  const frame = 'inline-flex h-5 min-w-8 items-center justify-center rounded-sm border px-1 text-caption text-ink';
  return (
    <ul aria-label={t('shiftCalendar.legend.title')} className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-ink-muted">
      <li className="inline-flex items-center gap-1">
        <span aria-hidden="true" className={`${frame} border-solid border-ink-muted bg-brand-blue-soft`}>
          HC
        </span>
        {t('shiftCalendar.legend.assigned')}
      </li>
      <li className="inline-flex items-center gap-1">
        <span aria-hidden="true" className={`${frame} border-dashed border-ink-muted`}>
          HC
        </span>
        {t('shiftCalendar.legend.default')}
      </li>
      <li className="inline-flex items-center gap-1">
        <span aria-hidden="true" className={`${frame} border-solid border-ink-muted bg-brand-blue-soft`}>
          <Moon className="size-3" />
        </span>
        {t('shiftCalendar.legend.night')}
      </li>
      <li className="inline-flex items-center gap-1">
        <span aria-hidden="true" className="size-4 rounded-sm border border-line bg-surface-muted" />
        {t('shiftCalendar.legend.off')}
      </li>
      <li className="inline-flex items-center gap-1">
        <span aria-hidden="true" className="h-4 w-4 border-b-2 border-brand-blue" />
        {t('shiftCalendar.legend.today')}
      </li>
    </ul>
  );
}
