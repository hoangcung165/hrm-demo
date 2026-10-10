// The request of an inbox row: its type, and the summary underneath ("Cập nhật hồ sơ" / "Số điện thoại, địa chỉ").
// In the "Tôi đã gửi" tab it leads the row, so the type is the link that opens the request.
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { ApprovalInboxItem } from '../api';

export type ApprovalRequestCellProps = {
  row: ApprovalInboxItem;
  /** The type is the link to the request (no sender column). */
  link?: boolean;
};

export function ApprovalRequestCell({ row, link = false }: ApprovalRequestCellProps) {
  const { t } = useTranslation();
  const type = t(`approvals.type.${row.type}`);
  return (
    <span className="flex min-w-0 flex-col">
      {link ? (
        <Link to={`/approvals/${row.id}`} className="truncate rounded-sm font-medium text-ink no-underline hover:text-brand-blue hover:underline">
          {type}
        </Link>
      ) : (
        <span className="truncate font-medium">{type}</span>
      )}
      <span className="truncate text-caption text-ink-muted">{row.summary}</span>
    </span>
  );
}
