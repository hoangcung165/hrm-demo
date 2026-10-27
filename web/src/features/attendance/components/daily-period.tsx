// The period: back, the range picker, forward, and "Tuần này" while another period is shown. At 390 only the pager.
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { formatDateRange, toIsoDate } from '@/lib/format';
import { DAILY_MAX_DAYS } from '../daily-api';
import { rangeLength } from '../daily-model';
import type { DailyFilters } from '../use-daily-filters';

export function DailyPeriod({ filters, compact }: { filters: DailyFilters; compact: boolean }) {
  const { t } = useTranslation();
  const { from, to } = filters.query;
  const days = rangeLength(from, to);
  return (
    <div role="group" aria-label={t('attendanceDaily.period.label')} className="flex items-start gap-2">
      <Button variant="secondary" size="icon" aria-label={t('attendanceDaily.period.back')} className="max-md:size-11" onClick={filters.back}>
        <ChevronLeft aria-hidden="true" />
      </Button>
      {compact ? (
        <span aria-live="polite" className="flex-1 self-center text-center text-body-strong tabular-nums">
          {formatDateRange(from, to)}
        </span>
      ) : (
        <DateRangePicker
          label={t('attendanceDaily.period.range')}
          labelHidden
          className="w-60"
          value={{ from: parseISO(from), to: parseISO(to) }}
          onChange={(value) => value.from && value.to && value.to >= value.from && filters.setRange(toIsoDate(value.from), toIsoDate(value.to))}
          error={filters.tooLong ? t('attendanceDaily.period.tooLong', { max: DAILY_MAX_DAYS, days }) : undefined}
        />
      )}
      <Button variant="secondary" size="icon" aria-label={t('attendanceDaily.period.forward')} className="max-md:size-11" onClick={filters.forward}>
        <ChevronRight aria-hidden="true" />
      </Button>
      {!compact && !filters.isThisWeek ? (
        <Button variant="ghost" size="sm" className="self-center" onClick={filters.toThisWeek}>
          {t('attendanceDaily.period.thisWeek')}
        </Button>
      ) : null}
    </div>
  );
}
