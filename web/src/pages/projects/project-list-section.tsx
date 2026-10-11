// The project list: the tabs, the filter bar and the table with its loading, empty, no-match, error and
// no-permission states (pattern P10).
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Tabs, type TabItem } from '@/components/ui/tabs';
import { PROJECT_PAGE_SIZE, useProjectCount, useProjects } from '@/features/project/api';
import { ProjectFilterBar } from '@/features/project/components/project-filter-bar';
import { ProjectTable } from '@/features/project/components/project-table';
import type { ProjectFilters, ProjectTab } from '@/features/project/use-project-filters';
import { ApiError } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import { useMediaQuery } from '@/lib/use-media-query';
import { ProjectListDenied } from './project-list-denied';
import { ProjectListEmpty } from './project-list-empty';

export type ProjectListSectionProps = { filters: ProjectFilters };

export function ProjectListSection({ filters }: ProjectListSectionProps) {
  const { t } = useTranslation();
  const compact = useMediaQuery('(max-width: 767px)');
  const projects = useProjects(filters.query);
  const { data } = projects;
  // The other tab's count, and the closed projects the default status filter leaves out.
  const mineCount = useProjectCount({ ...filters.query, mine: true }, filters.canHaveMine);
  const allCount = useProjectCount({ ...filters.query, mine: false }, filters.canHaveMine);
  const closed = useProjectCount({ ...filters.query, status: 'CLOSED' }, filters.status === 'OPEN');
  const denied = projects.error instanceof ApiError && projects.error.status === 403;
  const lastPage = data ? Math.max(0, Math.ceil(data.total / PROJECT_PAGE_SIZE) - 1) : 0;
  const pastEnd = Boolean(data) && !projects.isPlaceholderData && filters.query.page > lastPage;
  const { setPage } = filters;
  useEffect(() => {
    if (pastEnd) setPage(lastPage, true);
    // `setPage` is new on every render.
  }, [pastEnd, lastPage]);

  if (denied) return <ProjectListDenied />;
  const empty = !projects.isError && data?.total === 0;
  const tabs: Array<TabItem<ProjectTab>> = [
    { id: 'mine', label: t('projects.tab.mine'), count: mineCount.data },
    { id: 'all', label: t('projects.tab.all'), count: allCount.data },
  ];
  const summary = ({ from, to, total }: { from: number; to: number; total: number }) => {
    const shown = t(compact ? 'projects.paginationShort' : 'projects.pagination', { from: formatNumber(from), to: formatNumber(to), total: formatNumber(total) });
    const hidden = closed.data ?? 0;
    return !compact && hidden > 0 ? `${shown} ${t('projects.closedHidden', { count: hidden, number: formatNumber(hidden) })}` : shown;
  };
  const body = (
    <div className="flex flex-col gap-4">
      <ProjectFilterBar filters={filters} compact={compact} total={projects.isFetching ? undefined : data?.total} disabled={projects.isPending} />
      <div>
        <div role="status">{empty ? <ProjectListEmpty filters={filters} /> : null}</div>
        {projects.isError ? (
          <Card bare>
            <ErrorState title={t('projects.loadError')} onRetry={() => void projects.refetch()} />
          </Card>
        ) : empty ? null : (
          <ProjectTable
            rows={data?.items ?? []}
            total={data?.total ?? 0}
            pageIndex={data?.pageIndex ?? 0}
            onPageChange={(page) => filters.setPage(page)}
            summary={summary}
            loading={!data}
            busy={projects.isPlaceholderData}
            compact={compact}
          />
        )}
      </div>
    </div>
  );
  if (!filters.canHaveMine) return body;
  return (
    <div className="flex flex-col gap-4">
      <Tabs label={t('projects.title')} tabs={tabs} active={filters.tab} onChange={filters.setTab}>
        {body}
      </Tabs>
    </div>
  );
}
