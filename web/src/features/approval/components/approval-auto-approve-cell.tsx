// When the waiting level approves itself: the date and the days left, a warning Badge on the last day; or "Không tự
// duyệt" for flows without it (payroll, overtime by default). `compact` is the one-line caption of the 390 rows.
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatDayMonth } from '@/lib/format';
import { autoApproveDue } from '../auto-approve';

export type ApprovalAutoApproveCellProps = {
  dueAt: string | null;
  compact?: boolean;
};

export function ApprovalAutoApproveCell({ dueAt, compact = false }: ApprovalAutoApproveCellProps) {
  const { t } = useTranslation();
  if (!dueAt) return <span className="text-caption text-ink-muted">{t('approvals.auto.never')}</span>;
  const { daysLeft, soon } = autoApproveDue(dueAt);
  const left = daysLeft === 0 ? t('approvals.auto.today') : t('approvals.auto.daysLeft', { count: daysLeft });
  if (compact) {
    return (
      <span className={soon ? 'text-caption font-medium text-warning tabular-nums' : 'text-caption text-ink-muted tabular-nums'}>
        {t('approvals.auto.short', { date: formatDayMonth(dueAt) })}
      </span>
    );
  }
  return (
    <span className="flex flex-col items-start tabular-nums">
      {formatDate(dueAt)}
      {soon ? (
        <Badge variant="warning" className="mt-0.5 whitespace-nowrap">
          <Clock aria-hidden="true" />
          {left}
        </Badge>
      ) : (
        <span className="text-caption text-ink-muted">{left}</span>
      )}
    </span>
  );
}
