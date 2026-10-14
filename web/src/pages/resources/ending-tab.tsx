// The Sắp hết dự án tab of Nguồn lực: allocations that end within the configured weeks, earliest first, with the load
// the day after and what comes next; "Chỉ người chưa có phân bổ tiếp theo" keeps the ones that need a new project.
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ErrorState } from '@/components/ui/error-state';
import type { ResourceThresholds } from '@/features/resource/api';
import { EndingTable } from '@/features/resource/components/ending-table';
import { HeatmapUnitFilter } from '@/features/resource/components/heatmap-unit-filter';
import { RESOURCE_LIST_PAGE_SIZE, useEnding } from '@/features/resource/list-api';
import { useResourceListFilters } from '@/features/resource/use-resource-list-filters';
import { ApiError } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import { ListState } from './list-state';
import { ResourcesDenied } from './resources-denied';

export type EndingTabProps = { compact: boolean; thresholds?: ResourceThresholds };

export function EndingTab({ compact, thresholds }: EndingTabProps) {
  const { t } = useTranslation();
  const filters = useResourceListFilters();
  const ending = useEnding(filters.ending);
  const { data } = ending;
  const lastPage = data ? Math.max(0, Math.ceil(data.total / RESOURCE_LIST_PAGE_SIZE) - 1) : 0;
  const pastEnd = Boolean(data) && !ending.isPlaceholderData && filters.ending.page > lastPage;
  const { setPage } = filters;
  useEffect(() => {
    if (pastEnd) setPage(lastPage, true);
    // `setPage` is new on every render.
  }, [pastEnd, lastPage]);

  if (ending.error instanceof ApiError && ending.error.status === 403) return <ResourcesDenied />;
  const empty = !ending.isError && data?.total === 0;
  const summary = ({ from, to, total }: { from: number; to: number; total: number }) =>
    t(compact ? 'resources.ending.paginationShort' : 'resources.ending.pagination', { from: formatNumber(from), to: formatNumber(to), total: formatNumber(total) });
  const line = data ? t('resources.ending.summary', { count: data.summary.endingSoon, number: formatNumber(data.summary.endingSoon), weeks: data.weeks, without: formatNumber(data.summary.withoutNext) }) : null;

  return (
    <div className="flex flex-col gap-4">
      <div role="search" aria-label={t('resources.filter.label')} className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <HeatmapUnitFilter filters={filters} disabled={ending.isPending} className="w-full md:w-60" />
        <Checkbox checked={filters.onlyWithoutNext} onChange={(event) => filters.setOnlyWithoutNext(event.target.checked)}>
          {t('resources.ending.onlyWithoutNext')}
        </Checkbox>
      </div>
      <p aria-live="polite" className="min-h-6 text-body text-ink-muted">
        {line}
      </p>
      {ending.isError ? (
        <Card bare>
          <ErrorState title={t('resources.ending.loadError')} onRetry={() => void ending.refetch()} />
        </Card>
      ) : empty ? (
        <ListState scope="ending" filtered={filters.filtered} onlyWithoutNext={filters.onlyWithoutNext && !filters.ending.orgUnitId} value={data?.weeks ?? thresholds?.endingWeeks ?? 4} onClear={filters.clear} />
      ) : (
        <EndingTable data={data} thresholds={thresholds} onPageChange={(page) => filters.setPage(page)} summary={summary} busy={ending.isPlaceholderData} compact={compact} />
      )}
    </div>
  );
}
