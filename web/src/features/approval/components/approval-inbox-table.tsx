// One tab of the Hộp thư duyệt: a table, or compact two-line rows below 768px, paged by the server. The whole row
// opens the request; the sender's name (or the request, in "Tôi đã gửi") is the link keyboard users reach.
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { DataTable } from '@/components/ui/data-table';
import { formatNumber } from '@/lib/format';
import { APPROVAL_PAGE_SIZE, type ApprovalBox, type ApprovalInboxItem } from '../api';
import { useApprovalColumns } from './use-approval-columns';

export type ApprovalInboxTableProps = {
  box: ApprovalBox;
  /** The rows of the current page; ignored while `loading`. */
  rows: ApprovalInboxItem[];
  total: number;
  /** Zero-based. */
  pageIndex: number;
  onPageChange: (pageIndex: number) => void;
  /** First load: Skeleton rows. */
  loading?: boolean;
  /** Another page, tab or filter is loading: the rows stay. */
  busy?: boolean;
  compact?: boolean;
};

export function ApprovalInboxTable({ box, rows, total, pageIndex, onPageChange, loading = false, busy = false, compact = false }: ApprovalInboxTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const layout = useApprovalColumns(box);
  return (
    <DataTable
      caption={t(`approvals.caption.${box}`)}
      columns={layout.columns}
      data={loading ? [] : rows}
      rowKey={(row) => row.id}
      pageSize={APPROVAL_PAGE_SIZE}
      pageIndex={pageIndex}
      total={total}
      onPageChange={onPageChange}
      summary={(range) =>
        t(compact ? 'approvals.paginationShort' : 'approvals.pagination', { from: formatNumber(range.from), to: formatNumber(range.to), total: formatNumber(range.total) })
      }
      loading={loading}
      loadingLabel={t('approvals.loading')}
      loadingRows={5}
      busy={busy}
      onRowClick={(row) => navigate(`/approvals/${row.id}`)}
      variant={compact ? 'compact' : 'default'}
      rows={layout.rows}
    />
  );
}
