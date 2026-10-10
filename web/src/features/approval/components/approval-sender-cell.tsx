// The sender of an inbox row: Avatar, the name as the link that opens the request, and "NV00021 · Nhóm Web".
import { Link } from 'react-router';
import { Avatar } from '@/components/ui/avatar';
import type { EmployeeCard } from '../api';

export type ApprovalSenderCellProps = {
  requestId: string;
  sender: EmployeeCard;
  /** Replaces the code and unit, e.g. the request in compact rows. */
  caption?: string;
};

export function ApprovalSenderCell({ requestId, sender, caption }: ApprovalSenderCellProps) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar name={sender.fullName} size="md" />
      <span className="flex min-w-0 flex-col">
        <Link to={`/approvals/${requestId}`} className="truncate rounded-sm font-medium text-ink no-underline hover:text-brand-blue hover:underline">
          {sender.fullName}
        </Link>
        <span className="truncate text-caption text-ink-muted tabular-nums">
          {caption ?? [sender.code, sender.orgUnitName].filter(Boolean).join(' · ')}
        </span>
      </span>
    </span>
  );
}
