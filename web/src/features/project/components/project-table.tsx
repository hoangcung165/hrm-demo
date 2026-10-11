// The project list: a table, or compact two-line rows below 768px, paged by the server. The whole row opens the
// project; the name is the link keyboard and screen reader users reach.
import { ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Person } from '@/components/ui/person';
import { formatDate, formatNumber } from '@/lib/format';
import { PROJECT_PAGE_SIZE, type ProjectListItem } from '../api';
import { ProjectMembersCell } from './project-members-cell';
import { ProjectNameLink } from './project-name-link';
import { ProjectOverloadBadge } from './project-overload-badge';
import { ProjectStatusBadge } from './project-status-badge';

export type ProjectTableProps = {
  rows: ProjectListItem[];
  total: number;
  /** Zero-based. */
  pageIndex: number;
  onPageChange: (pageIndex: number) => void;
  /** The pager line, e.g. "Hiển thị 1–6 trên 6 dự án. Ẩn 2 dự án đã đóng." */
  summary: (range: { from: number; to: number; total: number }) => string;
  loading?: boolean;
  busy?: boolean;
  compact?: boolean;
};

const W = { pm: 'w-64 min-[1440px]:w-70', dates: 'w-36', members: 'w-32 min-[1440px]:w-35', status: 'w-32 min-[1440px]:w-35' };

export function ProjectTable({ rows, total, pageIndex, onPageChange, summary, loading = false, busy = false, compact = false }: ProjectTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const caption = (row: ProjectListItem) => `${row.code} · ${row.client ?? t('projects.internal')}`;

  const columns = useMemo<Array<DataTableColumn<ProjectListItem>>>(
    () => [
      { id: 'project', header: t('projects.col.project'), cell: (row) => <ProjectNameLink id={row.id} name={row.name} caption={caption(row)} /> },
      { id: 'pm', header: t('projects.col.pm'), className: W.pm, skeleton: 'person', cell: (row) => (row.pm ? <Person name={row.pm.fullName} caption={row.pm.orgUnitName ?? undefined} /> : null) },
      {
        id: 'dates',
        header: t('projects.col.dates'),
        className: W.dates,
        cell: (row) => (
          <span className="flex flex-col tabular-nums">
            <span>{formatDate(row.startDate)}</span>
            <span className="text-caption font-normal text-ink-muted">{t('projects.until', { date: formatDate(row.endDate) })}</span>
          </span>
        ),
      },
      { id: 'members', header: t('projects.col.members'), className: W.members, cell: (row) => <ProjectMembersCell members={row.members} status={row.status} /> },
      { id: 'status', header: t('projects.col.status'), className: W.status, cell: (row) => <ProjectStatusBadge status={row.status} /> },
    ],
    // `caption` depends on the language only.
    [t],
  );

  return (
    <DataTable
      caption={t('projects.list')}
      columns={columns}
      data={loading ? [] : rows}
      rowKey={(row) => row.id}
      pageSize={PROJECT_PAGE_SIZE}
      pageIndex={pageIndex}
      total={total}
      onPageChange={onPageChange}
      summary={(range) => summary({ from: range.from, to: range.to, total: range.total })}
      loading={loading}
      loadingLabel={t('projects.loading')}
      loadingRows={5}
      busy={busy}
      onRowClick={(row) => navigate(`/projects/${row.id}`)}
      variant={compact ? 'compact' : 'default'}
      rows={{
        lead: (row) => <ProjectNameLink id={row.id} name={row.name} caption={[row.code, row.pm ? t('projects.pmCaption', { name: row.pm.fullName }) : null].filter(Boolean).join(' · ')} />,
        meta: (row) => (
          <>
            <ProjectStatusBadge status={row.status} />
            <ProjectOverloadBadge count={row.members.overloaded} />
          </>
        ),
        metaLabel: t('projects.col.status'),
        end: (row) => (
          <span className="text-caption font-normal text-ink-muted tabular-nums">
            {t('projects.compactEnd', { count: row.members.running + row.members.upcoming, number: formatNumber(row.members.running + row.members.upcoming), date: formatDate(row.endDate) })}
          </span>
        ),
        endLabel: t('projects.col.members'),
        action: () => <ChevronRight aria-hidden="true" className="mx-3 size-5 stroke-[1.5] text-ink-muted" />,
      }}
    />
  );
}
