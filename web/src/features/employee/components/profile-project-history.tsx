// "Lịch sử tham gia dự án": one row per allocation, newest first. The project is a link for whoever may open projects.
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Person } from '@/components/ui/person';
import { formatDate, formatPercent } from '@/lib/format';
import type { EmployeeProjectItem } from '../profile-projects-api';
import { ProfileAllocationStatus } from './profile-allocation-status';

export type ProfileProjectHistoryProps = {
  rows: EmployeeProjectItem[];
  /** Accessible name: "Lịch sử tham gia dự án của Cao Minh Trí". */
  caption: string;
  /** Below 768px: two-line rows. */
  compact: boolean;
  /** Whoever has PROJECT_VIEW may open the project. */
  linkToProject: boolean;
};

const W = { role: 'w-44', percent: 'w-20 text-right', range: 'w-52', pm: 'w-48', status: 'w-36' };

function ProjectName({ row, link }: { row: EmployeeProjectItem; link: boolean }) {
  const { t } = useTranslation();
  return (
    <span className="flex min-w-0 flex-col">
      {link ? (
        <Link to={`/projects/${row.projectId}`} className="truncate rounded-sm font-medium text-ink no-underline hover:text-brand-blue hover:underline">
          {row.projectName}
        </Link>
      ) : (
        <span className="truncate font-medium">{row.projectName}</span>
      )}
      <span className="truncate text-caption font-normal text-ink-muted tabular-nums">{`${row.projectCode} · ${row.client ?? t('projects.internal')}`}</span>
    </span>
  );
}

export function ProfileProjectHistory({ rows, caption, compact, linkToProject }: ProfileProjectHistoryProps) {
  const { t } = useTranslation();
  const columns = useMemo<Array<DataTableColumn<EmployeeProjectItem>>>(
    () => [
      { id: 'project', header: t('employees.profile.projects.col.project'), cell: (row) => <ProjectName row={row} link={linkToProject} /> },
      { id: 'role', header: t('employees.profile.projects.col.role'), className: W.role, cell: (row) => row.projectRole?.name ?? '' },
      { id: 'percent', header: t('employees.profile.projects.col.percent'), className: W.percent, cell: (row) => <span className="font-medium tabular-nums">{formatPercent(row.percent)}</span> },
      { id: 'range', header: t('employees.profile.projects.col.range'), className: W.range, cell: (row) => <span className="tabular-nums">{`${formatDate(row.startDate)} – ${formatDate(row.endDate)}`}</span> },
      { id: 'pm', header: t('employees.profile.projects.col.pm'), className: W.pm, skeleton: 'person', cell: (row) => (row.pm ? <Person name={row.pm.fullName} caption={row.pm.orgUnitName ?? undefined} /> : null) },
      { id: 'status', header: t('employees.profile.projects.col.status'), className: W.status, cell: (row) => <ProfileAllocationStatus status={row.status} startDate={row.startDate} /> },
    ],
    [t, linkToProject],
  );
  return (
    <DataTable
      caption={caption}
      columns={columns}
      data={rows}
      rowKey={(row) => row.id}
      // One page: a person has a handful of projects a year.
      pageSize={200}
      variant={compact ? 'compact' : 'default'}
      rows={{
        lead: (row) => <ProjectName row={row} link={linkToProject} />,
        meta: (row) => (
          <>
            <span className="text-caption text-ink-muted tabular-nums">{`${[row.projectRole?.name, formatPercent(row.percent)].filter(Boolean).join(' · ')} · ${formatDate(row.startDate)} – ${formatDate(row.endDate)}`}</span>
          </>
        ),
        metaLabel: t('employees.profile.projects.col.range'),
        end: (row) => <ProfileAllocationStatus status={row.status} startDate={row.startDate} />,
        endLabel: t('employees.profile.projects.col.status'),
      }}
    />
  );
}
