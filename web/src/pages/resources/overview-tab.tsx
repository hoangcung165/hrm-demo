// The Tổng quan tab of Nguồn lực: stat tiles, the head count of the running projects, the level of Tải phân bổ this
// week and over the next 12 weeks, and the people who need attention; for a week and a department. Read-only. The
// whole dashboard comes in one answer, but each block has its own loading and error state with its own retry.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { HeatmapRangePager } from '@/features/resource/components/heatmap-range-pager';
import { HeatmapUnitFilter } from '@/features/resource/components/heatmap-unit-filter';
import { OverviewAttention } from '@/features/resource/components/overview-attention';
import { OverviewBlock } from '@/features/resource/components/overview-block';
import { OverviewProjects } from '@/features/resource/components/overview-projects';
import { OverviewThisWeek } from '@/features/resource/components/overview-this-week';
import { OverviewTiles } from '@/features/resource/components/overview-tiles';
import { OverviewWeeksChart } from '@/features/resource/components/overview-weeks-chart';
import { OverviewWeeksTable } from '@/features/resource/components/overview-weeks-table';
import { useOverview } from '@/features/resource/overview-api';
import { useOverviewFilters } from '@/features/resource/use-overview-filters';
import { ApiError } from '@/lib/api';
import { ResourcesDenied } from './resources-denied';

export function OverviewTab() {
  const { t } = useTranslation();
  const filters = useOverviewFilters();
  const overview = useOverview(filters.query);
  const [asTable, setAsTable] = useState(false);
  const { data } = overview;
  if (overview.error instanceof ApiError && overview.error.status === 403) return <ResourcesDenied />;

  const block = (key: string) => ({
    loading: overview.isPending,
    error: overview.isError,
    onRetry: () => void overview.refetch(),
    errorTitle: t(`resources.overview.${key}.loadError`),
    loadingLabel: t(`resources.overview.${key}.loading`),
  });

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div role="search" aria-label={t('resources.overview.filter')} className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <HeatmapUnitFilter filters={filters} disabled={overview.isPending} className="w-full md:w-60" />
        <HeatmapRangePager filters={filters} data={data ? { from: data.weekFrom, to: data.weekTo } : undefined} disabled={overview.isPending} />
      </div>

      {overview.isError ? (
        <Card bare>
          <ErrorState title={t('resources.overview.tilesError')} onRetry={() => void overview.refetch()} />
        </Card>
      ) : (
        <OverviewTiles data={data} unit={filters.query.orgUnitId} />
      )}

      <div className="grid gap-4 md:gap-6 xl:grid-cols-2">
        <OverviewBlock title={t('resources.overview.projects.title')} description={t('resources.overview.projects.description')} {...block('projects')}>
          {data ? <OverviewProjects projects={data.projects} /> : null}
        </OverviewBlock>
        <OverviewBlock title={t('resources.overview.thisWeek.title')} {...block('thisWeek')}>
          {data ? <OverviewThisWeek levels={data.thisWeek} /> : null}
        </OverviewBlock>
      </div>

      <OverviewBlock
        title={t('resources.overview.weeks.title')}
        aside={
          data && !overview.isError ? (
            <Button variant="secondary" size="sm" aria-pressed={asTable} onClick={() => setAsTable((value) => !value)}>
              {t(asTable ? 'resources.overview.weeks.showChart' : 'resources.overview.weeks.showTable')}
            </Button>
          ) : undefined
        }
        {...block('weeks')}
      >
        {data ? asTable ? <OverviewWeeksTable weeks={data.weeks} /> : <OverviewWeeksChart weeks={data.weeks} /> : null}
      </OverviewBlock>

      <OverviewBlock title={t('resources.overview.attention.title')} {...block('attention')}>
        {data ? <OverviewAttention attention={data.attention} unit={filters.query.orgUnitId} /> : null}
      </OverviewBlock>
    </div>
  );
}
