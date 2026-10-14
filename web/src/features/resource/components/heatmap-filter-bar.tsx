// Filter bar of the heatmap. Desktop: search, unit, load level, sort, "Xóa bộ lọc" while anything differs from the
// defaults, and the week / month switch. Below 768px: the search and "Lọc" (with how many filters are on).
import { ListFilter } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { HeatmapFilters } from '../use-heatmap-filters';
import { HeatmapFilterDialog } from './heatmap-filter-dialog';
import { HeatmapLevelFilter } from './heatmap-level-filter';
import { HeatmapSearchInput } from './heatmap-search-input';
import { HeatmapSortFilter } from './heatmap-sort-filter';
import { HeatmapUnitFilter } from './heatmap-unit-filter';
import { HeatmapViewSwitch } from './heatmap-view-switch';

export type HeatmapFilterBarProps = {
  filters: HeatmapFilters;
  compact: boolean;
  /** How many people match now, for the dialog's button; `undefined` while loading. */
  total: number | undefined;
  disabled?: boolean;
};

export function HeatmapFilterBar({ filters, compact, total, disabled = false }: HeatmapFilterBarProps) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  if (compact) {
    return (
      <div role="search" aria-label={t('resources.filter.label')} className="flex gap-2">
        <HeatmapSearchInput filters={filters} compact disabled={disabled} className="h-11 min-w-0 flex-1" />
        <Button variant="secondary" className="h-11 shrink-0" onClick={() => setDialogOpen(true)}>
          <ListFilter aria-hidden="true" />
          {t('resources.filter.open')}
          {filters.activeCount > 0 ? (
            <Badge variant="info" className="h-5">
              <span aria-hidden="true">{filters.activeCount}</span>
              <span className="sr-only">{t('resources.filter.activeCount', { count: filters.activeCount })}</span>
            </Badge>
          ) : null}
        </Button>
        <HeatmapFilterDialog open={dialogOpen} onOpenChange={setDialogOpen} filters={filters} total={total} />
      </div>
    );
  }
  return (
    <div role="search" aria-label={t('resources.filter.label')} className="flex flex-wrap items-center gap-3">
      <HeatmapSearchInput filters={filters} disabled={disabled} className="w-72" />
      <HeatmapUnitFilter filters={filters} disabled={disabled} className="w-52 min-[1440px]:w-60" />
      <HeatmapLevelFilter filters={filters} disabled={disabled} className="w-44" />
      <HeatmapSortFilter filters={filters} disabled={disabled} className="w-48" />
      {filters.filtered ? (
        <Button variant="ghost" size="sm" className="shrink-0" onClick={filters.clear}>
          {t('resources.filter.clear')}
        </Button>
      ) : null}
      <span className="flex-1" />
      <HeatmapViewSwitch filters={filters} disabled={disabled} />
    </div>
  );
}
