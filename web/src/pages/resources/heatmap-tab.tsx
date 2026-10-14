// The Heatmap tab of Nguồn lực: filters, the period pager, the table with its loading, no-match, nobody-allocated and
// error states, the legend and the pages (pattern P10). Read-only.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';
import { HEATMAP_PAGE_SIZE, useHeatmap } from '@/features/resource/api';
import type { CellSelection } from '@/features/resource/cell-selection';
import { CellDetailDrawer } from '@/features/resource/components/cell-detail-drawer';
import { HeatmapFilterBar } from '@/features/resource/components/heatmap-filter-bar';
import { HeatmapLegend } from '@/features/resource/components/heatmap-legend';
import { HeatmapRangePager } from '@/features/resource/components/heatmap-range-pager';
import { HeatmapSummary } from '@/features/resource/components/heatmap-summary';
import { HeatmapTable } from '@/features/resource/components/heatmap-table';
import { HeatmapViewSwitch } from '@/features/resource/components/heatmap-view-switch';
import type { HeatmapFilters } from '@/features/resource/use-heatmap-filters';
import { ApiError } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import { HeatmapEmpty } from './heatmap-empty';
import { ResourcesDenied } from './resources-denied';

export type HeatmapTabProps = { filters: HeatmapFilters; compact: boolean };

export function HeatmapTab({ filters, compact }: HeatmapTabProps) {
  const { t } = useTranslation();
  const heatmap = useHeatmap(filters.query);
  const [selection, setSelection] = useState<CellSelection | null>(null);
  const { data } = heatmap;
  const denied = heatmap.error instanceof ApiError && heatmap.error.status === 403;
  const lastPage = data ? Math.max(0, Math.ceil(data.total / HEATMAP_PAGE_SIZE) - 1) : 0;
  const pastEnd = Boolean(data) && !heatmap.isPlaceholderData && filters.query.page > lastPage;
  const { setPage } = filters;
  useEffect(() => {
    if (pastEnd) setPage(lastPage, true);
    // `setPage` is new on every render.
  }, [pastEnd, lastPage]);

  if (denied) return <ResourcesDenied />;
  const empty = !heatmap.isError && data?.total === 0;
  // Nobody has a load in the columns shown, and nothing narrows the list: highest load first, so every row is 0%.
  const nobodyAllocated = Boolean(data) && !empty && !filters.filtered && filters.query.page === 0 && filters.query.sort === 'LOAD_DESC' && !filters.query.level && data!.items.every((row) => row.peak === 0);
  const summary = ({ from, to, total }: { from: number; to: number; total: number }) =>
    t(compact ? 'resources.heatmap.paginationShort' : 'resources.heatmap.pagination', { from: formatNumber(from), to: formatNumber(to), total: formatNumber(total) });

  return (
    <div className="flex flex-col gap-4">
      <HeatmapFilterBar filters={filters} compact={compact} total={heatmap.isFetching ? undefined : data?.total} disabled={heatmap.isPending} />
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <HeatmapRangePager filters={filters} data={data} disabled={heatmap.isPending} />
        {compact ? <HeatmapViewSwitch filters={filters} disabled={heatmap.isPending} /> : <HeatmapSummary data={data} />}
      </div>
      {compact ? <HeatmapSummary data={data} /> : null}
      <div role="status">{nobodyAllocated ? <Alert variant="info" title={t('resources.heatmap.nobodyAllocated')} /> : null}</div>
      {heatmap.isError ? (
        <Card bare>
          <ErrorState title={t('resources.heatmap.loadError')} onRetry={() => void heatmap.refetch()} />
        </Card>
      ) : empty ? (
        <HeatmapEmpty filters={filters} />
      ) : (
        <>
          <HeatmapTable data={data} busy={heatmap.isPlaceholderData} compact={compact} onCellSelect={setSelection} selected={selection} />
          {data ? <HeatmapLegend thresholds={data.thresholds} /> : null}
          {data && data.total > HEATMAP_PAGE_SIZE ? (
            <Pagination pageIndex={data.page} pageSize={HEATMAP_PAGE_SIZE} total={data.total} onPageChange={(page) => filters.setPage(page)} summary={summary} variant={compact ? 'compact' : 'default'} />
          ) : null}
        </>
      )}
      <CellDetailDrawer
        selection={selection}
        data={data}
        onSelect={setSelection}
        onClose={() => setSelection(null)}
        fallbackFocus={() => document.querySelector<HTMLElement>('table tbody button')}
      />
    </div>
  );
}
