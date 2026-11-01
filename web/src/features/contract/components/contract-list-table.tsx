// The contract list: a table at 768px and above, compact rows below. Each row opens the Employee's Hợp đồng tab; the
// name is the link keyboard and screen reader users reach, a click anywhere on the row does the same for the pointer.
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { formatDate, formatNumber } from '@/lib/format';
import { CONTRACT_LIST_PAGE_SIZE, type ContractList, type ContractListItem } from '../list-api';
import { ContractStateBadge } from './contract-state-badge';

export type ContractListTableProps = {
  /** `undefined` while the first page is on its way. */
  data: ContractList | undefined;
  /** The next page or filter is on its way: the rows stay and the list is busy. */
  busy: boolean;
  compact: boolean;
  onPageChange: (pageIndex: number) => void;
};

const profilePath = (row: ContractListItem) => `/employees/${row.employeeId}?tab=contracts`;

export function ContractListTable({ data, busy, compact, onPageChange }: ContractListTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const typeLabel = (row: ContractListItem) => t(`employees.profile.contracts.type.${row.contractType}`, { defaultValue: row.contractType });
  const term = (row: ContractListItem) => `${formatDate(row.startsOn)} – ${row.endsOn ? formatDate(row.endsOn) : t('contractList.openEnded')}`;
  const remaining = (row: ContractListItem) => (row.daysRemaining === null ? null : t('contractList.remaining', { count: row.daysRemaining }));
  const state = (row: ContractListItem) => (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <ContractStateBadge state={row.state} />
      {remaining(row) ? <span className="text-caption tabular-nums text-ink-muted">{remaining(row)}</span> : null}
    </span>
  );

  const columns: Array<DataTableColumn<ContractListItem>> = [
    {
      id: 'employee',
      header: t('contractList.col.employee'),
      skeleton: 'person',
      className: 'w-60',
      cell: (row) => (
        <span className="flex flex-col">
          <Link to={profilePath(row)} className="font-medium text-brand-blue underline-offset-2 hover:underline">
            {row.employeeName}
            <span className="sr-only">, {t('contractList.col.number')} {row.contractNumber}</span>
          </Link>
          <span className="text-caption text-ink-muted">{row.employeeCode}</span>
        </span>
      ),
    },
    { id: 'number', header: t('contractList.col.number'), className: 'w-44', cell: (row) => <span className="tabular-nums">{row.contractNumber}</span> },
    { id: 'type', header: t('contractList.col.type'), cell: typeLabel },
    { id: 'term', header: t('contractList.col.term'), className: 'w-60', cell: (row) => <span className="tabular-nums">{term(row)}</span> },
    { id: 'state', header: t('contractList.col.state'), className: 'w-56', cell: state },
  ];

  return (
    <DataTable
      caption={t('contractList.list')}
      columns={columns}
      data={data?.items ?? []}
      rowKey={(row) => row.id}
      pageSize={CONTRACT_LIST_PAGE_SIZE}
      pageIndex={data?.page ?? 0}
      total={data?.total ?? 0}
      onPageChange={onPageChange}
      loading={!data}
      loadingLabel={t('contractList.loading')}
      busy={busy}
      variant={compact ? 'compact' : 'default'}
      onRowClick={(row) => void navigate(profilePath(row))}
      summary={({ from, to, total }) => t('contractList.pagination', { from: formatNumber(from), to: formatNumber(to), total: formatNumber(total) })}
      rows={{
        lead: (row) => (
          <Link to={profilePath(row)} className="font-medium text-brand-blue">
            {row.employeeName} · {row.contractNumber}
          </Link>
        ),
        meta: (row) => (
          <span className="text-caption text-ink-muted">
            {typeLabel(row)} · <span className="tabular-nums">{term(row)}</span>
          </span>
        ),
        metaLabel: t('contractList.col.term'),
        end: state,
        endLabel: t('contractList.col.state'),
      }}
    />
  );
}
