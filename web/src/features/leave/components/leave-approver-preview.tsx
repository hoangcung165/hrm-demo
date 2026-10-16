// "Người duyệt": who decides first under the Luồng phê duyệt "Nghỉ phép", read-only (the employee does not choose),
// and when the flow approves by itself. Known once the check has run.
import { useTranslation } from 'react-i18next';
import { Person } from '@/components/ui/person';
import type { LeaveApprovers } from '../request-api';

export type LeaveApproverPreviewProps = {
  approvers: LeaveApprovers | undefined;
  /** Inside a Card that already says "Người duyệt". */
  labelHidden?: boolean;
};

export function LeaveApproverPreview({ approvers, labelHidden = false }: LeaveApproverPreviewProps) {
  const { t } = useTranslation();
  const levels = approvers ? t('leave.approver.levels', { count: approvers.levelCount }) : '';
  return (
    <section aria-label={t('leave.approver.label')} className="flex flex-col gap-2">
      {labelHidden ? null : <h3 className="text-[14px] leading-5 font-medium">{t('leave.approver.label')}</h3>}
      {!approvers ? (
        <p className="text-body-small text-ink-muted">{t('leave.approver.unknown')}</p>
      ) : approvers.firstLevel.length ? (
        <ul className="flex flex-col gap-2">
          {approvers.firstLevel.map((person) => (
            <li key={person.id}>
              <Person name={person.fullName} caption={`${t('leave.approver.first')} · ${levels}`} size="md" />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-body-small">{t('leave.approver.escalated')}</p>
      )}
      <p className="text-caption text-ink-muted">
        {approvers?.autoApproveDays ? t('leave.approver.flowAuto', { count: approvers.autoApproveDays }) : t('leave.approver.flow')}
      </p>
    </section>
  );
}
