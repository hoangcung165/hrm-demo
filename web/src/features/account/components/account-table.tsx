// The Account list: a table, or compact two-line rows below 768px, paged by the server. Read-only.
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Person } from '@/components/ui/person';
import { useCurrentAccount } from '@/features/auth/account-context';
import { useAccountActions } from '../account-actions-context';
import { formatDate, formatNumber } from '@/lib/format';
import { useMediaQuery } from '@/lib/use-media-query';
import { ACCOUNT_PAGE_SIZE, type AccountRow } from '../api';
import { AccountRoleBadges } from './account-role-badges';
import { AccountRowMenu } from './account-row-menu';
import { AccountStatusBadge } from './account-status-badge';

export type AccountTableProps = {
  /** The rows of the current page; ignored while `loading`. */
  rows: AccountRow[];
  total: number;
  /** Zero-based. */
  pageIndex: number;
  onPageChange: (pageIndex: number) => void;
  loading?: boolean;
};

export function AccountTable({ rows, total, pageIndex, onPageChange, loading = false }: AccountTableProps) {
  const { t } = useTranslation();
  const ownId = useCurrentAccount().id;
  const compact = useMediaQuery('(max-width: 767px)');
  // The actions column is absent without ACCOUNT_EDIT.
  const canEdit = useAccountActions() !== null;

  // "Bạn" on the caller's own row, "Persona demo" on a demo Account; never wraps.
  const tag = (row: AccountRow) => {
    const text = row.id === ownId ? t('accounts.you') : row.demoPersona ? t('accounts.persona') : null;
    return text ? (
      <Badge variant="neutral" className="shrink-0 whitespace-nowrap">
        {text}
      </Badge>
    ) : null;
  };
  const columns = useMemo<Array<DataTableColumn<AccountRow>>>(
    () => [
      {
        id: 'account',
        header: t('accounts.col.account'),
        skeleton: 'person',
        cell: (row) => (
          <span className="flex min-w-0 items-center gap-2">
            <Person name={row.fullName} caption={row.email} className="font-medium" />
            {tag(row)}
          </span>
        ),
      },
      {
        id: 'roles',
        header: t('accounts.col.roles'),
        className: 'w-66',
        cell: (row) => (
          <span className="flex flex-wrap gap-1">
            <AccountRoleBadges roles={row.roles} />
          </span>
        ),
      },
      { id: 'scope', header: t('accounts.col.scope'), className: 'w-38', cell: (row) => t(`accounts.scope.${row.dataScope}`) },
      { id: 'status', header: t('accounts.col.status'), className: 'w-38', cell: (row) => <AccountStatusBadge status={row.status} /> },
      { id: 'created', header: t('accounts.col.created'), className: 'w-28', cell: (row) => <span className="tabular-nums">{formatDate(row.createdAt)}</span> },
      ...(canEdit ? [{ id: 'actions', header: t('accounts.col.actions'), headerHidden: true, className: 'w-14', cell: (row: AccountRow) => <AccountRowMenu account={row} /> }] : []),
    ],
    // `tag` depends on the language and the caller only.
    [t, ownId, canEdit],
  );

  return (
    <DataTable
      caption={t('accounts.list')}
      columns={columns}
      data={loading ? [] : rows}
      rowKey={(row) => row.id}
      pageSize={ACCOUNT_PAGE_SIZE}
      pageIndex={pageIndex}
      total={total}
      onPageChange={onPageChange}
      summary={(range) => t('accounts.pagination', { from: formatNumber(range.from), to: formatNumber(range.to), total: formatNumber(range.total) })}
      loading={loading}
      loadingLabel={t('accounts.loading')}
      variant={compact ? 'compact' : 'default'}
      // At 390 the data scope and the created date drop out; the "Bạn" / "Persona demo" Badge moves to line two.
      rows={{
        lead: (row) => <Person name={row.fullName} caption={row.email} size="md" className="font-medium" />,
        meta: (row) => (
          <>
            <AccountRoleBadges roles={row.roles} />
            {tag(row)}
          </>
        ),
        metaLabel: t('accounts.col.roles'),
        end: (row) => <AccountStatusBadge status={row.status} />,
        endLabel: t('accounts.col.status'),
        action: canEdit ? (row) => <AccountRowMenu account={row} touch /> : undefined,
      }}
    />
  );
}
