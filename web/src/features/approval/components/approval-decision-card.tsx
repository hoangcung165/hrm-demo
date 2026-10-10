// "Quyết định của bạn" (artboard `#12 Chi tiết yêu cầu`): the waiting level, the auto-approve time, an optional
// note, Duyệt as the one primary action, then Trả về and Từ chối, which ask for a reason.
import { Check, Clock, CornerUpLeft, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { formatDayMonthTime } from '@/lib/format';
import type { ApprovalRequestDetail } from '../api';
import { approverLabel } from '../approver-label';
import type { ApprovalDecide } from '../use-approval-decide';

export type ApprovalDecisionCardProps = {
  request: ApprovalRequestDetail;
  decide: ApprovalDecide;
};

export function ApprovalDecisionCard({ request, decide }: ApprovalDecisionCardProps) {
  const { t } = useTranslation();
  const step = request.steps[request.level - 1];
  const behalf = request.allowed.onBehalfOf;
  return (
    <section aria-label={t('approvals.detail.decision.label')} className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex-1 font-semibold">
          {t('approvals.detail.decision.waiting', { level: request.level, count: request.levelCount, approver: step ? approverLabel(t, step.rule, step.role) : '' })}
        </span>
        {request.autoApproveDueAt ? (
          <Badge variant="warning" className="whitespace-nowrap tabular-nums">
            <Clock aria-hidden="true" />
            {t('approvals.detail.decision.auto', { at: formatDayMonthTime(request.autoApproveDueAt) })}
          </Badge>
        ) : null}
      </div>
      {behalf ? (
        <Badge variant="info" className="self-start">
          {t('approvals.detail.decision.onBehalf', { name: behalf.fullName })}
        </Badge>
      ) : null}
      <Field label={t('approvals.detail.decision.note')} helper={t('approvals.detail.decision.noteOptional')}>
        {(control) => (
          <Textarea
            {...control}
            rows={2}
            maxLength={1000}
            placeholder={t('approvals.detail.decision.notePlaceholder')}
            value={decide.note}
            onChange={(event) => decide.setNote(event.target.value)}
          />
        )}
      </Field>
      <Button className="w-full" disabled={decide.pending} onClick={decide.approve}>
        <Check aria-hidden="true" />
        {t('approvals.detail.decision.approve')}
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" disabled={decide.pending} onClick={() => decide.openDialog('return')}>
          <CornerUpLeft aria-hidden="true" />
          {t('approvals.detail.decision.return')}
        </Button>
        <Button variant="secondary" className="text-danger" disabled={decide.pending} onClick={() => decide.openDialog('reject')}>
          <X aria-hidden="true" />
          {t('approvals.detail.decision.reject')}
        </Button>
      </div>
      <span className="text-caption text-ink-muted">{t('approvals.detail.decision.hint')}</span>
    </section>
  );
}
