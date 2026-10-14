// The pager over the columns: the period shown, back and forward by one page of columns, and "Tuần này" / "Tháng này".
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { formatDateRange } from '@/lib/format';
import type { Heatmap } from '../api';
import type { HeatmapFilters } from '../use-heatmap-filters';

export type HeatmapRangePagerProps = { filters: HeatmapFilters; data: Heatmap | undefined; disabled?: boolean };

export function HeatmapRangePager({ filters, data, disabled = false }: HeatmapRangePagerProps) {
  const { t } = useTranslation();
  const weekly = filters.granularity === 'WEEK';
  return (
    <div role="group" aria-label={t('resources.heatmap.range')} className="flex items-center gap-2">
      <Button variant="secondary" size="icon-sm" aria-label={t('resources.heatmap.back')} disabled={disabled || !filters.canStepBack} onClick={filters.back}>
        <ChevronLeft aria-hidden="true" />
      </Button>
      <span className="min-w-32 text-center text-body-strong tabular-nums">{data ? formatDateRange(data.from, data.to) : '…'}</span>
      <Button variant="secondary" size="icon-sm" aria-label={t('resources.heatmap.forward')} disabled={disabled || !filters.canStepForward} onClick={filters.forward}>
        <ChevronRight aria-hidden="true" />
      </Button>
      {filters.offset !== 0 ? (
        <Button variant="ghost" size="sm" disabled={disabled} onClick={filters.today}>
          {t(weekly ? 'resources.heatmap.thisWeek' : 'resources.heatmap.thisMonth')}
        </Button>
      ) : null}
    </div>
  );
}
