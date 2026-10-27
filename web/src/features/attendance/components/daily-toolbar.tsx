// The filter bar over the list. A desktop shows period, unit and search in one row and the switch and sort under it;
// at 390 the pager, a "Lọc" button for unit, search and sort, and the switch.
import { SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { DailyFilters } from '../use-daily-filters';
import { DailyFilterDialog } from './daily-filter-dialog';
import { DailyPeriod } from './daily-period';
import { DailySearch } from './daily-search';
import { DailySortSelect } from './daily-sort';
import { DailyUnitFilter } from './daily-unit-filter';

export type DailyToolbarProps = { filters: DailyFilters; compact: boolean; /** An Account without ATTENDANCE_VIEW reads its own days: only the period applies. */ ownOnly?: boolean };

export function DailyToolbar({ filters, compact, ownOnly = false }: DailyToolbarProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { query } = filters;
  const abnormal = <Switch checked={query.abnormalOnly} onChange={filters.setAbnormal} label={t('attendanceDaily.filter.abnormalOnly')} className="max-md:flex-1" />;
  if (ownOnly) return <DailyPeriod filters={filters} compact={compact} />;
  if (compact) {
    return (
      <div role="search" aria-label={t('attendanceDaily.filter.label')} className="flex flex-col gap-3">
        <DailyPeriod filters={filters} compact />
        <div className="flex items-center gap-3">
          <Button variant="secondary" className="h-11" onClick={() => setOpen(true)}>
            <SlidersHorizontal aria-hidden="true" />
            {t('attendanceDaily.filter.open')}
            {filters.activeCount > 0 ? <span className="tabular-nums text-ink-muted">({filters.activeCount})</span> : null}
          </Button>
          <span className="flex-1" />
          {abnormal}
        </div>
        <DailyFilterDialog open={open} onOpenChange={setOpen} filters={filters} />
      </div>
    );
  }
  return (
    <div role="search" aria-label={t('attendanceDaily.filter.label')} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start gap-2">
        <DailyPeriod filters={filters} compact={false} />
        <DailyUnitFilter value={query.orgUnitId} onChange={filters.setUnit} className="w-72" />
        <DailySearch value={query.q} onCommit={filters.setSearch} className="min-w-64 flex-1" />
        {filters.activeCount > 0 ? (
          <Button variant="ghost" size="sm" className="self-center" onClick={filters.clear}>
            {t('attendanceDaily.filter.clear')}
          </Button>
        ) : null}
      </div>
      <div className="flex items-center gap-4">
        {abnormal}
        <span className="flex-1" />
        <span className="text-caption text-ink-muted">{t('attendanceDaily.sort.label')}</span>
        <DailySortSelect value={query.sort} onChange={filters.setSort} className="w-56" />
      </div>
    </div>
  );
}
