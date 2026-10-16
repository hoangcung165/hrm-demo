// A loaded request: the head with its status, what happened to it (returned with the reason, cancelled), the
// sender's actions, the details, how the days count, and the approval steps. One column at 390.
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { DayBreakdown } from '@/components/ui/day-breakdown';
import { ApprovalStepList } from '@/features/approval/components/approval-step-list';
import { useCurrentAccount } from '@/features/auth/account-context';
import type { LeaveRequestDetail } from '@/features/leave/api';
import { LeaveStatusBadge } from '@/features/leave/components/leave-status-badge';
import { dayRows } from '@/features/leave/day-rows';
import { formatDays } from '@/features/leave/leave-format';
import { LeaveBackLink } from './leave-back-link';
import { LeaveRequestActions } from './leave-request-actions';
import { LeaveRequestInfo } from '@/features/leave/components/leave-request-info';
import { LeaveRequestNotice } from './leave-request-notice';

export type LeaveRequestViewProps = { request: LeaveRequestDetail };

export function LeaveRequestView({ request }: LeaveRequestViewProps) {
  const { t } = useTranslation();
  const { employeeId } = useCurrentAccount();
  const sender = request.employee.id === employeeId;
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <LeaveBackLink to={sender ? '/leave' : '/'} label={sender ? t('leave.title') : t('nav.overview')} />
        <h1 className="text-title">{sender ? t('leave.detail.title') : t('leave.detail.titleOf', { name: request.employee.fullName })}</h1>
        <p className="flex flex-wrap items-center gap-2 text-body-small text-ink-muted">
          <span>{t('leave.list.rowTitle', { type: request.leaveType.name, days: formatDays(request.days) })}</span>
          <LeaveStatusBadge status={request.status} />
        </p>
      </div>
      <LeaveRequestNotice request={request} />
      {sender ? <LeaveRequestActions request={request} /> : null}
      <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_380px] md:gap-6">
        <div className="flex flex-col gap-4 md:gap-6">
          <Card title={t('leave.detail.infoTitle')}>
            <LeaveRequestInfo request={request} />
          </Card>
          <DayBreakdown title={t('leave.form.daysTitle')} total={t('leave.days', { value: formatDays(request.days) })} rows={dayRows(t, request.dayList)} />
        </div>
        {request.approval ? (
          <Card title={t('approvals.detail.steps.title')}>
            <ApprovalStepList request={request.approval} me={employeeId} />
          </Card>
        ) : null}
      </div>
      {sender && (request.canCancel || request.canEdit) ? <p className="text-caption text-ink-muted">{t('leave.detail.cancelNote')}</p> : null}
    </div>
  );
}
