// A loaded Đơn bổ sung công: the head with its status, the sender's actions (or the form when a returned request is
// edited), the facts, the day now beside the day once approved, and the approval steps. One column at 390.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { DetailList } from '@/components/ui/detail-list';
import { Loading } from '@/components/ui/loading';
import { useAdjustmentCheck, type AdjustmentDetail } from '@/features/attendance/adjustment-api';
import { AdjustmentDayCompare } from '@/features/attendance/components/adjustment-day-compare';
import { adjustmentFacts } from '@/features/attendance/components/adjustment-facts';
import { AdjustmentForm } from '@/features/attendance/components/adjustment-form';
import { dayLabel } from '@/features/attendance/components/daily-cells';
import { useAdjustmentForm } from '@/features/attendance/use-adjustment-form';
import { ApprovalStepList } from '@/features/approval/components/approval-step-list';
import { useCurrentAccount } from '@/features/auth/account-context';
import { LeaveStatusBadge } from '@/features/leave/components/leave-status-badge';
import { AdjustmentRequestActions } from './adjustment-request-actions';

function EditCard({ request, onClose }: { request: AdjustmentDetail; onClose: () => void }) {
  const { t } = useTranslation();
  const check = useAdjustmentCheck(request.date);
  const form = useAdjustmentForm({ date: request.date, editing: request, onDone: onClose });
  // The day now has no time on the sides this request gives, so the check offers exactly them.
  return (
    <Card title={t('attendanceAdjustment.edit')}>
      {check.data ? <AdjustmentForm check={check.data} form={form} editing submitLabel={t('attendanceAdjustment.resend')} onCancel={onClose} /> : <Loading label={t('attendanceAdjustment.loading')} />}
    </Card>
  );
}

export function AdjustmentRequestView({ request }: { request: AdjustmentDetail }) {
  const { t } = useTranslation();
  const { employeeId } = useCurrentAccount();
  const [editing, setEditing] = useState(false);
  const sender = request.employee.id === employeeId;
  const day = `${dayLabel(request.date, t)}/${request.date.slice(0, 4)}`;
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-title">{sender ? t('attendanceAdjustment.title') : t('attendanceAdjustment.titleOf', { name: request.employee.fullName })}</h1>
        <p className="flex flex-wrap items-center gap-2 text-body-small text-ink-muted">
          <span>{day}</span>
          <LeaveStatusBadge status={request.status} />
        </p>
      </div>
      {sender && !editing ? <AdjustmentRequestActions request={request} onEdit={() => setEditing(true)} /> : null}
      {editing ? <EditCard request={request} onClose={() => setEditing(false)} /> : null}
      <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_380px] md:gap-6">
        <div className="flex flex-col gap-4 md:gap-6">
          <Card title={t('attendanceAdjustment.approval.title')}>
            <DetailList items={adjustmentFacts(request, t)} />
          </Card>
          <Card title={t('attendanceAdjustment.compare.title')}>
            <AdjustmentDayCompare now={request.dayNow} after={request.dayAfter} caption={t('attendanceAdjustment.compare.caption', { day })} />
          </Card>
        </div>
        {request.approval ? (
          <Card title={t('approvals.detail.steps.title')}>
            <ApprovalStepList request={request.approval} me={employeeId} />
          </Card>
        ) : null}
      </div>
    </div>
  );
}
