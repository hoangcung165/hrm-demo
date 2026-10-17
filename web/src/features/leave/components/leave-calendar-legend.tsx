// What the marks mean: approved (solid, check), waiting (dashed, clock), holiday, and that a half day is named.
import { Check, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function LeaveCalendarLegend() {
  const { t } = useTranslation();
  return (
    <ul aria-label={t('leave.calendar.legend.title')} className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-ink-muted">
      <li className="inline-flex items-center gap-1">
        <span className="inline-flex size-4 items-center justify-center rounded-sm bg-brand-blue-soft text-ink">
          <Check aria-hidden="true" className="size-3" />
        </span>
        {t('leave.calendar.legend.approved')}
      </li>
      <li className="inline-flex items-center gap-1">
        <span className="inline-flex size-4 items-center justify-center rounded-sm border border-dashed border-ink-muted text-ink">
          <Clock aria-hidden="true" className="size-3" />
        </span>
        {t('leave.calendar.legend.pending')}
      </li>
      <li className="inline-flex items-center gap-1">
        <span aria-hidden="true" className="size-4 rounded-sm border border-line bg-surface-muted" />
        {t('leave.calendar.legend.holiday')}
      </li>
      <li>{t('leave.calendar.legend.half')}</li>
    </ul>
  );
}
