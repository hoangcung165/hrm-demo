// The Bench tab of Nguồn lực: people under the bench threshold for the whole period (this week by default, or a week or
// month), lowest load first, with their next allocation and latest project. Read-only.
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { BenchTable } from '@/features/resource/components/bench-table';
import { HeatmapRangePager } from '@/features/resource/components/heatmap-range-pager';
import { HeatmapUnitFilter } from '@/features/resource/components/heatmap-unit-filter';
import { HeatmapViewSwitch } from '@/features/resource/components/heatmap-view-switch';
import { RESOURCE_LIST_PAGE_SIZE, useBench } from '@/features/resource/list-api';
import { useResourceListFilters } from '@/features/resource/use-resource-list-filters';
import { ApiError } from '@/lib/api';
import { formatDateRange, formatNumber } from '@/lib/format';
import { ListState } from './list-state';
import { ResourcesDenied } from './resources-denied';

export type BenchTabProps = { compact: boolean };

export function BenchTab({ compact }: BenchTabProps) {
  const { t } = useTranslation();
  const filters = useResourceListFilters();
  const bench = useBench(filters.bench);
  const { data } = bench;
  const lastPage = data ? Math.max(0, Math.ceil(data.total / RESOURCE_LIST_PAGE_SIZE) - 1) : 0;
  const pastEnd = Boolean(data) && !bench.isPlaceholderData && filters.bench.page > lastPage;
  const { setPage } = filters;
  useEffect(() => {
    if (pastEnd) setPage(lastPage, true);
    // `setPage` is new on every render.
  }, [pastEnd, lastPage]);

  if (bench.error instanceof ApiError && bench.error.status === 403) return <ResourcesDenied />;
  const empty = !bench.isError && data?.total === 0;
  const weekly = filters.granularity === 'WEEK';
  const summary = ({ from, to, total }: { from: number; to: number; total: number }) =>
    t(compact ? 'resources.bench.paginationShort' : 'resources.bench.pagination', { from: formatNumber(from), to: formatNumber(to), total: formatNumber(total) });
  const line = data
    ? t('resources.bench.summary', {
        count: data.total,
        number: formatNumber(data.total),
        percent: data.thresholds.benchPercent,
        period: filters.offset === 0 ? t(weekly ? 'resources.bench.thisWeek' : 'resources.bench.thisMonth') : t('resources.bench.inRange', { range: formatDateRange(data.from, data.to) }),
        none: formatNumber(data.summary.noAllocation),
        below: formatNumber(data.summary.belowThreshold),
      })
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div role="search" aria-label={t('resources.filter.label')} className="flex flex-wrap items-center gap-3">
        <HeatmapUnitFilter filters={filters} disabled={bench.isPending} className="w-full md:w-60" />
        {filters.filtered ? (
          <button type="button" onClick={filters.clear} className="cursor-pointer rounded-sm px-2 text-[14px] font-medium text-brand-blue hover:bg-brand-blue-soft focus-visible:shadow-focus-ring">
            {t('resources.filter.clear')}
          </button>
        ) : null}
        <span className="hidden flex-1 md:block" />
        <HeatmapViewSwitch filters={filters} disabled={bench.isPending} />
      </div>
      <HeatmapRangePager filters={filters} data={data} disabled={bench.isPending} />
      <p aria-live="polite" className="min-h-6 text-body text-ink-muted">
        {line}
      </p>
      {bench.isError ? (
        <Card bare>
          <ErrorState title={t('resources.bench.loadError')} onRetry={() => void bench.refetch()} />
        </Card>
      ) : empty ? (
        <ListState scope="bench" filtered={filters.filtered} value={data?.thresholds.benchPercent ?? 50} onClear={filters.clear} />
      ) : (
        <BenchTable data={data} onPageChange={(page) => filters.setPage(page)} summary={summary} busy={bench.isPlaceholderData} compact={compact} />
      )}
    </div>
  );
}
