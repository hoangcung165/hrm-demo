// The current step of an inbox row: "Cấp 2/2", who approves it, and the labels that change how to read it:
// "Duyệt thay <name>" when the caller stands in for someone, "Đã bổ sung, gửi lại" after a return.
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import type { ApprovalInboxItem } from '../api';
import { approverLabel } from '../approver-label';

export type ApprovalStepCellProps = { row: ApprovalInboxItem };

export function ApprovalStepCell({ row }: ApprovalStepCellProps) {
  const { t } = useTranslation();
  return (
    <span className="flex min-w-0 flex-col items-start">
      <span className="font-medium tabular-nums">{t('approvals.level', { level: row.level, count: row.levelCount })}</span>
      <span className="text-caption text-ink-muted">{approverLabel(t, row.rule, row.role)}</span>
      {row.onBehalfOf ? (
        <Badge variant="info" className="mt-1 max-w-full">
          <span className="truncate">{t('approvals.onBehalfOf', { name: row.onBehalfOf.fullName })}</span>
        </Badge>
      ) : null}
      {row.resubmitted && row.status === 'PENDING' ? (
        <Badge variant="neutral" className="mt-1 whitespace-nowrap">
          {t('approvals.resubmitted')}
        </Badge>
      ) : null}
    </span>
  );
}
