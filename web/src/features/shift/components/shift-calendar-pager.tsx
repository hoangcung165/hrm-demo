// The period shown with back, forward and "Hôm nay" (only when another period is shown).
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { ShiftCalendarFilters } from '../use-calendar-filters';

export type ShiftCalendarPagerProps = { filters: ShiftCalendarFilters; period: string };

export function ShiftCalendarPager({ filters, period }: ShiftCalendarPagerProps) {
  const { t } = useTranslation();
  const unit = filters.view === 'WEEK' ? 'Week' : 'Month';
  return (
    <div role="group" aria-label={t('shiftCalendar.range')} className="flex items-center gap-2">
      <Button variant="secondary" size="icon-sm" aria-label={t(`shiftCalendar.back${unit}`)} onClick={filters.back}>
        <ChevronLeft aria-hidden="true" />
      </Button>
      <span aria-live="polite" className="min-w-36 text-center text-body-strong tabular-nums">
        {period}
      </span>
      <Button variant="secondary" size="icon-sm" aria-label={t(`shiftCalendar.forward${unit}`)} onClick={filters.forward}>
        <ChevronRight aria-hidden="true" />
      </Button>
      {!filters.isCurrent ? (
        <Button variant="ghost" size="sm" onClick={filters.toToday}>
          {t('shiftCalendar.today')}
        </Button>
      ) : null}
    </div>
  );
}
