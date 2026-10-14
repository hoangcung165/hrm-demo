// The Bench list: people under the bench threshold in the period, lowest load first; a table, or compact rows below
// 768px, paged by the server.
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { HeatCell } from '@/components/ui/heat-cell';
import { formatDate, formatPercent } from '@/lib/format';
import { RESOURCE_LIST_PAGE_SIZE, type AllocationBrief, type Bench, type BenchRow } from '../list-api';
import { ResourcePersonCell } from './resource-person-cell';
import { ResourceRowMenu } from './resource-row-menu';

export type BenchTableProps = {
  data: Bench | undefined;
  onPageChange: (pageIndex: number) => void;
  summary: (range: { from: number; to: number; total: number }) => string;
  busy?: boolean;
  compact?: boolean;
};

export function BenchTable({ data, onPageChange, summary, busy = false, compact = false }: BenchTableProps) {
  const { t } = useTranslation();
  const thresholds = data ? { bench: data.thresholds.benchPercent, nearFull: data.thresholds.nearFullPercent } : undefined;
  const project = (brief: AllocationBrief) => `${brief.projectCode} · ${brief.projectName}`;
  const next = (row: BenchRow) => (row.nextAllocation ? t('resources.bench.nextValue', { project: project(row.nextAllocation), percent: formatPercent(row.nextAllocation.percent), date: formatDate(row.nextAllocation.startDate) }) : t('resources.bench.none'));
  const latest = (row: BenchRow) =>
    row.latestProject
      ? t(data && row.latestProject.endDate < data.to ? 'resources.bench.latestEnded' : 'resources.bench.latestOngoing', { project: project(row.latestProject), date: formatDate(row.latestProject.endDate) })
      : t('resources.bench.none');
  const load = (row: BenchRow) => <HeatCell percent={row.peak} size="sm" thresholds={thresholds} label={t('projects.load.label', { percent: formatPercent(row.peak) })} />;

  const columns = useMemo<Array<DataTableColumn<BenchRow>>>(
    () => [
      { id: 'person', header: t('resources.bench.col.person'), skeleton: 'person', cell: (row) => <ResourcePersonCell employee={row.employee} /> },
      { id: 'load', header: t('resources.bench.col.load'), className: 'w-28', cell: load },
      { id: 'next', header: t('resources.bench.col.next'), className: 'w-72', cell: next },
      { id: 'latest', header: t('resources.bench.col.latest'), className: 'w-72', cell: latest },
      { id: 'actions', header: t('resources.row.actionsHeader'), headerHidden: true, className: 'w-14', cell: (row) => <ResourceRowMenu employee={row.employee} /> },
    ],
    // `load`, `next` and `latest` depend on the thresholds, the period and the language only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, data?.to, data?.thresholds],
  );

  return (
    <DataTable
      caption={t('resources.bench.caption')}
      columns={columns}
      data={data?.items ?? []}
      rowKey={(row) => row.employee.id}
      pageSize={RESOURCE_LIST_PAGE_SIZE}
      pageIndex={data?.page ?? 0}
      total={data?.total ?? 0}
      onPageChange={onPageChange}
      summary={summary}
      loading={!data}
      loadingLabel={t('resources.bench.loading')}
      loadingRows={6}
      busy={busy}
      variant={compact ? 'compact' : 'default'}
      rows={{
        lead: (row) => <ResourcePersonCell employee={row.employee} />,
        meta: (row) => (
          <>
            {load(row)}
            <span className="text-caption text-ink-muted">{next(row)}</span>
          </>
        ),
        metaLabel: t('resources.bench.col.next'),
        action: (row) => <ResourceRowMenu employee={row.employee} compact />,
      }}
    />
  );
}
