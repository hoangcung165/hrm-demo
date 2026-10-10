// The columns of each inbox tab (artboard `#12 Hộp thư duyệt`) and its compact rows at 390 (`#12 Hộp thư duyệt
// (390)`). "Chờ tôi duyệt" is about deciding: sender, request, step, sent, auto-approve. "Tôi đã gửi" leads with the
// request and its status; "Đã xử lý" with the sender and the outcome.
import { ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { DataTableColumn } from '@/components/ui/data-table';
import type { DataRowsLayout } from '@/components/ui/data-rows';
import { formatDayMonthTime } from '@/lib/format';
import type { ApprovalBox, ApprovalInboxItem } from '../api';
import { approverLabel } from '../approver-label';
import { ApprovalAutoApproveCell } from './approval-auto-approve-cell';
import { ApprovalRequestCell } from './approval-request-cell';
import { ApprovalSenderCell } from './approval-sender-cell';
import { ApprovalSentAtCell } from './approval-sent-at-cell';
import { ApprovalStatusBadge } from './approval-status-badge';
import { ApprovalStepCell } from './approval-step-cell';

type Column = DataTableColumn<ApprovalInboxItem>;

// The artboard widths from 1440px; narrower below, so the sender keeps room at 1280.
const W = {
  request: 'w-60 min-[1440px]:w-72',
  step: 'w-48 min-[1440px]:w-55',
  time: 'w-28 min-[1440px]:w-30',
  auto: 'w-32 min-[1440px]:w-35',
  status: 'w-56 min-[1440px]:w-60',
  open: 'w-14',
};

export function useApprovalColumns(box: ApprovalBox): { columns: Column[]; rows: DataRowsLayout<ApprovalInboxItem> } {
  const { t } = useTranslation();
  return useMemo(() => {
    /** The step a request waits at, or was returned or ended at, as one caption: "Cấp 2/2 · HR". */
    const atLevel = (row: ApprovalInboxItem) =>
      t('approvals.atLevel', { level: row.level, count: row.levelCount, approver: approverLabel(t, row.rule, row.role) });
    const open: Column = {
      id: 'open',
      header: t('approvals.col.open'),
      headerHidden: true,
      className: W.open,
      cell: (row) => (
        <Link
          to={`/approvals/${row.id}`}
          aria-label={t('approvals.openRequest')}
          tabIndex={-1}
          className="ml-auto grid size-8 place-items-center rounded-sm text-ink-muted hover:bg-surface-muted [&_svg]:size-4 [&_svg]:stroke-[1.5]"
        >
          <ChevronRight aria-hidden="true" />
        </Link>
      ),
    };
    const sender: Column = { id: 'sender', header: t('approvals.col.sender'), skeleton: 'person', cell: (row) => <ApprovalSenderCell requestId={row.id} sender={row.sender} /> };
    const request: Column = { id: 'request', header: t('approvals.col.request'), className: W.request, cell: (row) => <ApprovalRequestCell row={row} /> };
    const sentAt: Column = { id: 'sentAt', header: t('approvals.col.sentAt'), className: W.time, cell: (row) => <ApprovalSentAtCell at={row.sentAt} /> };
    const status: Column = {
      id: 'status',
      header: t('approvals.col.status'),
      className: W.status,
      cell: (row) => (
        <span className="flex flex-col items-start gap-1">
          <ApprovalStatusBadge status={row.status} />
          <span className="text-caption text-ink-muted tabular-nums">{atLevel(row)}</span>
        </span>
      ),
    };
    const chevron = () => <ChevronRight aria-hidden="true" className="mx-3 size-5 stroke-[1.5] text-ink-muted" />;
    const requestCaption = (row: ApprovalInboxItem) => `${t(`approvals.type.${row.type}`)} · ${row.summary}`;

    if (box === 'WAITING') {
      return {
        columns: [
          sender,
          request,
          { id: 'step', header: t('approvals.col.step'), className: W.step, cell: (row) => <ApprovalStepCell row={row} /> },
          sentAt,
          { id: 'auto', header: t('approvals.col.autoApprove'), className: W.auto, cell: (row) => <ApprovalAutoApproveCell dueAt={row.autoApproveDueAt} /> },
          open,
        ],
        rows: {
          lead: (row) => <ApprovalSenderCell requestId={row.id} sender={row.sender} caption={requestCaption(row)} />,
          meta: (row) => (
            <span className="text-caption text-ink-muted tabular-nums">
              {t('approvals.level', { level: row.level, count: row.levelCount })} · {formatDayMonthTime(row.sentAt)}
              {row.onBehalfOf ? ` · ${t('approvals.onBehalfOf', { name: row.onBehalfOf.fullName })}` : ''}
            </span>
          ),
          metaLabel: t('approvals.col.step'),
          end: (row) => <ApprovalAutoApproveCell dueAt={row.autoApproveDueAt} compact />,
          endLabel: t('approvals.col.autoApprove'),
          action: chevron,
        },
      };
    }
    const sentRows: DataRowsLayout<ApprovalInboxItem> = {
      lead: (row) => <ApprovalRequestCell row={row} link />,
      meta: (row) => <span className="text-caption text-ink-muted tabular-nums">{atLevel(row)} · {formatDayMonthTime(row.sentAt)}</span>,
      metaLabel: t('approvals.col.step'),
      end: (row) => <ApprovalStatusBadge status={row.status} />,
      endLabel: t('approvals.col.status'),
      action: chevron,
    };
    if (box === 'SENT') {
      return {
        columns: [
          { ...request, className: undefined, cell: (row) => <ApprovalRequestCell row={row} link /> },
          status,
          sentAt,
          { id: 'updatedAt', header: t('approvals.col.updatedAt'), className: W.time, cell: (row) => <ApprovalSentAtCell at={row.updatedAt} /> },
          open,
        ],
        rows: sentRows,
      };
    }
    return {
      columns: [sender, request, status, sentAt, open],
      rows: { ...sentRows, lead: (row) => <ApprovalSenderCell requestId={row.id} sender={row.sender} caption={requestCaption(row)} /> },
    };
  }, [t, box]);
}
