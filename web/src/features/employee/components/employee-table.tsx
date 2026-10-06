// The employee list: a table, or compact two-line rows below 768px, paged by the server. The whole row opens the
// profile; the name is the link keyboard and screen reader users reach.
import { ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Person } from '@/components/ui/person';
import { formatDate, formatNumber } from '@/lib/format';
import { EMPLOYEE_PAGE_SIZE, type EmployeeListItem } from '../api';
import { EmployeePersonLink } from './employee-person-link';
import { EmployeeStatusBadge } from './employee-status-badge';
import { EmployeeUnitCell } from './employee-unit-cell';

export type EmployeeTableProps = {
  /** The rows of the current page; ignored while `loading`. */
  rows: EmployeeListItem[];
  total: number;
  /** Zero-based. */
  pageIndex: number;
  onPageChange: (pageIndex: number) => void;
  /** First load: Skeleton rows. */
  loading?: boolean;
  /** Another page or filter is loading: the rows stay. */
  busy?: boolean;
  compact?: boolean;
};

// The artboard widths from 1440px; narrower below, so the name keeps room at 1280.
const W = {
  unit: 'w-44 min-[1440px]:w-60',
  position: 'w-32 min-[1440px]:w-35',
  manager: 'w-44 min-[1440px]:w-50',
  hireDate: 'w-28 min-[1440px]:w-31',
  status: 'w-32 min-[1440px]:w-33',
};

export function EmployeeTable({ rows, total, pageIndex, onPageChange, loading = false, busy = false, compact = false }: EmployeeTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const none = <span className="text-ink-muted">{t('employees.none')}</span>;

  const columns = useMemo<Array<DataTableColumn<EmployeeListItem>>>(
    () => [
      { id: 'employee', header: t('employees.col.employee'), skeleton: 'person', cell: (row) => <EmployeePersonLink id={row.id} fullName={row.fullName} caption={row.code} /> },
      { id: 'unit', header: t('employees.col.unit'), className: W.unit, cell: (row) => <EmployeeUnitCell unit={row.orgUnit} /> },
      { id: 'position', header: t('employees.col.position'), className: W.position, cell: (row) => row.position?.name ?? none },
      { id: 'manager', header: t('employees.col.manager'), className: W.manager, cell: (row) => (row.manager ? <Person name={row.manager.fullName} /> : none) },
      { id: 'hireDate', header: t('employees.col.hireDate'), className: W.hireDate, cell: (row) => <span className="tabular-nums">{formatDate(row.hireDate)}</span> },
      { id: 'status', header: t('employees.col.status'), className: W.status, cell: (row) => <EmployeeStatusBadge status={row.status} /> },
    ],
    // `none` depends on the language only.
    [t],
  );

  return (
    <DataTable
      caption={t('employees.list')}
      columns={columns}
      data={loading ? [] : rows}
      rowKey={(row) => row.id}
      pageSize={EMPLOYEE_PAGE_SIZE}
      pageIndex={pageIndex}
      total={total}
      onPageChange={onPageChange}
      summary={(range) =>
        t(compact ? 'employees.paginationShort' : 'employees.pagination', { from: formatNumber(range.from), to: formatNumber(range.to), total: formatNumber(range.total) })
      }
      loading={loading}
      loadingLabel={t('employees.loading')}
      loadingRows={5}
      busy={busy}
      onRowClick={(row) => navigate(`/employees/${row.id}`)}
      variant={compact ? 'compact' : 'default'}
      // At 390 line one carries the code and the position, line two the unit and the status.
      rows={{
        lead: (row) => <EmployeePersonLink id={row.id} fullName={row.fullName} caption={[row.code, row.position?.name].filter(Boolean).join(' · ')} />,
        meta: (row) => <EmployeeUnitCell unit={row.orgUnit} compact />,
        metaLabel: t('employees.col.unit'),
        end: (row) => <EmployeeStatusBadge status={row.status} />,
        endLabel: t('employees.col.status'),
        action: () => <ChevronRight aria-hidden="true" className="mx-3 size-5 stroke-[1.5] text-ink-muted" />,
      }}
    />
  );
}
