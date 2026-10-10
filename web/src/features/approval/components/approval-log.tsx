// "Nhật ký" of a request, newest first: who did what at which level, with "duyệt thay" and the system's Tự duyệt.
// The system's approve lines that follow a Tự duyệt are folded into it.
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { formatDayMonthTime } from '@/lib/format';
import type { ApprovalLogEntry, ApprovalRequestDetail } from '../api';
import { approverLabel } from '../approver-label';

function line(t: TFunction, entry: ApprovalLogEntry, request: ApprovalRequestDetail): string | null {
  const actor = entry.actor?.fullName ?? t('approvals.detail.log.system');
  const behalf = entry.onBehalfOf?.fullName;
  const values = { actor, behalf, level: entry.level };
  switch (entry.event) {
    case 'LEVEL_REACHED': {
      const step = request.steps[entry.level - 1];
      return t('approvals.detail.log.LEVEL_REACHED', { level: entry.level, approver: step ? approverLabel(t, step.rule, step.role) : '' });
    }
    case 'ESCALATED':
      return t('approvals.detail.log.ESCALATED', { level: entry.level, to: entry.escalatedTo ? t(`approvals.detail.log.escalatedTo.${entry.escalatedTo}`) : '' });
    case 'AUTO_APPROVED':
      return t('approvals.detail.log.AUTO_APPROVED', { level: entry.level, days: request.autoApproveDays ?? '' });
    case 'LEVEL_APPROVED':
      // The system's approval right after a Tự duyệt says nothing new.
      return entry.actor ? t(behalf ? 'approvals.detail.log.LEVEL_APPROVED_behalf' : 'approvals.detail.log.LEVEL_APPROVED', values) : null;
    case 'APPROVED':
      return entry.actor ? t(behalf ? 'approvals.detail.log.APPROVED_behalf' : 'approvals.detail.log.APPROVED', values) : t('approvals.detail.log.APPROVED_system');
    case 'REJECTED':
    case 'RETURNED':
      return t(behalf ? `approvals.detail.log.${entry.event}_behalf` : `approvals.detail.log.${entry.event}`, values);
    default:
      return t(`approvals.detail.log.${entry.event}`, values);
  }
}

export type ApprovalLogProps = { request: ApprovalRequestDetail };

export function ApprovalLog({ request }: ApprovalLogProps) {
  const { t } = useTranslation();
  const lines = [...request.log]
    .reverse()
    .map((entry, index) => ({ entry, index, text: line(t, entry, request) }))
    .filter((item): item is { entry: ApprovalLogEntry; index: number; text: string } => item.text !== null);
  return (
    <ul className="flex flex-col gap-3">
      {lines.map(({ entry, index, text }) => (
        <li key={index} className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 md:grid-cols-[116px_minmax(0,1fr)]">
          <span className="text-ink-muted tabular-nums">{formatDayMonthTime(entry.at)}</span>
          <span className="flex min-w-0 flex-col items-start gap-1">
            <span className="flex flex-wrap items-center gap-2">
              {entry.event === 'AUTO_APPROVED' ? <Badge variant="neutral">{t('approvals.detail.log.system')}</Badge> : null}
              {text}
            </span>
            {entry.comment ? <span className="text-ink-muted [overflow-wrap:anywhere]">“{entry.comment}”</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
