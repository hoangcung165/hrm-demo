// The Sắp hết dự án list: allocations that end within the configured weeks, earliest end first, with the load the day
// after and what comes next; a table, or compact rows below 768px, paged by the server.
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { HeatCell } from '@/components/ui/heat-cell';
import { formatDate, formatPercent } from '@/lib/format';
import type { ResourceThresholds } from '../api';
import { RESOURCE_LIST_PAGE_SIZE, type Ending, type EndingRow } from '../list-api';
import { ResourcePersonCell } from './resource-person-cell';
import { ResourceRowMenu } from './resource-row-menu';

export type EndingTableProps = {
  data: Ending | undefined;
  /** The thresholds of the company (they come with the Bench and the heatmap, not with this list). */
  thresholds?: ResourceThresholds;
  onPageChange: (pageIndex: number) => void;
  summary: (range: { from: number; to: number; total: number }) => string;
  busy?: boolean;
  compact?: boolean;
};

export function EndingTable({ data, thresholds, onPageChange, summary, busy = false, compact = false }: EndingTableProps) {
  const { t } = useTranslation();
  const heat = thresholds ? { bench: thresholds.benchPercent, nearFull: thresholds.nearFullPercent } : undefined;
  const days = (row: EndingRow) => t(row.daysLeft === 0 ? 'resources.ending.daysLeftToday' : 'resources.ending.daysLeft', { count: row.daysLeft });
  const after = (row: EndingRow) => <HeatCell percent={row.loadAfter} size="sm" thresholds={heat} label={t('projects.load.label', { percent: formatPercent(row.loadAfter) })} />;
  const next = (row: EndingRow) =>
    row.withoutNext ? (
      <Badge variant="warning">{t('resources.ending.withoutNext')}</Badge>
    ) : row.next ? (
      t('resources.ending.nextValue', { project: `${row.next.projectCode} · ${row.next.projectName}`, percent: formatPercent(row.next.percent), date: formatDate(row.next.startDate) })
    ) : (
      t('resources.ending.staysElsewhere')
    );

  const columns = useMemo<Array<DataTableColumn<EndingRow>>>(
    () => [
      { id: 'person', header: t('resources.ending.col.person'), skeleton: 'person', cell: (row) => <ResourcePersonCell employee={row.employee} /> },
      {
        id: 'project',
        header: t('resources.ending.col.project'),
        className: 'w-64',
        cell: (row) => (
          <span className="flex flex-col">
            <span>{`${row.allocation.projectCode} · ${row.allocation.projectName}`}</span>
            <span className="text-caption font-normal text-ink-muted">{[row.allocation.projectRole?.name, formatPercent(row.allocation.percent)].filter(Boolean).join(' · ')}</span>
          </span>
        ),
      },
      {
        id: 'end',
        header: t('resources.ending.col.end'),
        className: 'w-36',
        cell: (row) => (
          <span className="flex flex-col tabular-nums">
            <span>{formatDate(row.allocation.endDate)}</span>
            <span className="text-caption font-normal text-ink-muted">{days(row)}</span>
          </span>
        ),
      },
      { id: 'after', header: t('resources.ending.col.after'), className: 'w-28', cell: after },
      { id: 'next', header: t('resources.ending.col.next'), className: 'w-72', cell: next },
      { id: 'actions', header: t('resources.row.actionsHeader'), headerHidden: true, className: 'w-14', cell: (row) => <ResourceRowMenu employee={row.employee} /> },
    ],
    // `days`, `after` and `next` depend on the thresholds and the language only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, thresholds],
  );

  return (
    <DataTable
      caption={t('resources.ending.caption')}
      columns={columns}
      data={data?.items ?? []}
      rowKey={(row) => row.allocation.id}
      pageSize={RESOURCE_LIST_PAGE_SIZE}
      pageIndex={data?.page ?? 0}
      total={data?.total ?? 0}
      onPageChange={onPageChange}
      summary={summary}
      loading={!data}
      loadingLabel={t('resources.ending.loading')}
      loadingRows={6}
      busy={busy}
      variant={compact ? 'compact' : 'default'}
      rows={{
        lead: (row) => <ResourcePersonCell employee={row.employee} />,
        meta: (row) => (
          <>
            <span className="text-caption text-ink-muted">{`${row.allocation.projectCode} · ${formatDate(row.allocation.endDate)}, ${days(row)}`}</span>
            {after(row)}
            {typeof next(row) === 'string' ? <span className="text-caption text-ink-muted">{next(row)}</span> : next(row)}
          </>
        ),
        metaLabel: t('resources.ending.col.project'),
        action: (row) => <ResourceRowMenu employee={row.employee} compact />,
      }}
    />
  );
}
