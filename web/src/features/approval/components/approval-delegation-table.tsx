// The delegations of one side of the tab "Ủy quyền duyệt" (artboard `#12 Ủy quyền duyệt`): the other person, the dates,
// the request types and the status, and for the caller's own ones "Kết thúc sớm" (in force) or "Hủy ủy quyền"
// (upcoming).
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Person } from '@/components/ui/person';
import { formatDateRange } from '@/lib/format';
import type { ApprovalDelegation, ApprovalDelegationStatus } from '../api';
import { delegationTypes } from '../delegation-types';

const STATUS: Record<ApprovalDelegationStatus, BadgeProps['variant']> = { ACTIVE: 'success', UPCOMING: 'info', ENDED: 'neutral' };

export type ApprovalDelegationTableProps = {
  side: 'given' | 'received';
  rows: ApprovalDelegation[];
  /** The caller's own delegations: end one early or cancel one. */
  onEnd?: (delegation: ApprovalDelegation) => void;
  onCancel?: (delegation: ApprovalDelegation) => void;
  compact: boolean;
};

export function ApprovalDelegationTable({ side, rows, onEnd, onCancel, compact }: ApprovalDelegationTableProps) {
  const { t } = useTranslation();
  const columns = useMemo<Array<DataTableColumn<ApprovalDelegation>>>(() => {
    const other = (d: ApprovalDelegation) => (side === 'given' ? d.delegate : d.delegator);
    const list: Array<DataTableColumn<ApprovalDelegation>> = [
      {
        id: 'person',
        header: t(side === 'given' ? 'delegations.col.delegate' : 'delegations.col.delegator'),
        skeleton: 'person',
        cell: (d) => <Person name={other(d).fullName} caption={[other(d).code, other(d).orgUnitName].filter(Boolean).join(' · ')} />,
      },
      { id: 'range', header: t('delegations.col.range'), className: 'w-56', cell: (d) => <span className="tabular-nums">{formatDateRange(d.startDate, d.endDate)}</span> },
      { id: 'types', header: t('delegations.col.types'), className: 'w-64', cell: (d) => delegationTypes(t, d.requestTypes) },
      { id: 'status', header: t('delegations.col.status'), className: 'w-36', cell: (d) => <Badge variant={STATUS[d.status]}>{t(`delegations.status.${d.status}`)}</Badge> },
    ];
    if (side === 'given') {
      list.push({ id: 'actions', header: t('delegations.col.actions'), headerHidden: true, className: 'w-40', cell: (d) => action(d) });
    }
    return list;
    // `action` depends on the handlers, which the section keeps stable enough for a small list.
  }, [t, side, onEnd, onCancel]);

  function action(d: ApprovalDelegation) {
    if (d.status === 'ACTIVE' && onEnd) {
      return (
        <Button variant="secondary" size="sm" onClick={() => onEnd(d)}>
          {t('delegations.endEarly.button')}
        </Button>
      );
    }
    if (d.status === 'UPCOMING' && onCancel) {
      return (
        <Button variant="secondary" size="sm" onClick={() => onCancel(d)}>
          {t('delegations.cancel.button')}
        </Button>
      );
    }
    return null;
  }

  return (
    <DataTable
      caption={t(side === 'given' ? 'delegations.given.caption' : 'delegations.received.caption')}
      columns={columns}
      data={rows}
      rowKey={(d) => d.id}
      pageSize={50}
      variant={compact ? 'compact' : 'default'}
      rows={{
        lead: (d) => {
          const person = side === 'given' ? d.delegate : d.delegator;
          return <Person name={person.fullName} caption={formatDateRange(d.startDate, d.endDate)} />;
        },
        meta: (d) => <span className="text-caption text-ink-muted">{delegationTypes(t, d.requestTypes)}</span>,
        metaLabel: t('delegations.col.types'),
        end: (d) => <Badge variant={STATUS[d.status]}>{t(`delegations.status.${d.status}`)}</Badge>,
        endLabel: t('delegations.col.status'),
        action: side === 'given' ? (d) => action(d) : undefined,
      }}
    />
  );
}
