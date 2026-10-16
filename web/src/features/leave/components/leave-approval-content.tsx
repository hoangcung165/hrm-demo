// What a leave request asks for, in the approval inbox (artboard `#18 Duyệt đơn nghỉ`): the request, the sender's
// balance before and after it, and who else of the unit is off on those days.
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Loading } from '@/components/ui/loading';
import { ApiError } from '@/lib/api';
import { useLeaveRequest } from '../api';
import { LeaveAbsenceList } from './leave-absence-list';
import { LeaveBalanceFacts } from './leave-balance-facts';
import { LeaveRequestInfo } from './leave-request-info';

export type LeaveApprovalContentProps = {
  requestId: string;
  /** The approval request's status and level: a decision loads the request again. */
  version: string;
  /** The approval request's summary, shown when it has no leave request behind it (sent from code). */
  summary: string;
};

export function LeaveApprovalContent({ requestId, version, summary }: LeaveApprovalContentProps) {
  const { t } = useTranslation();
  const request = useLeaveRequest(requestId, version);
  if (request.error instanceof ApiError && request.error.status === 404) {
    return (
      <Card title={t('approvals.detail.content.title')}>
        <p className="[overflow-wrap:anywhere]">{summary}</p>
      </Card>
    );
  }
  if (request.isError) {
    return (
      <Card bare>
        <ErrorState title={t('leave.detail.loadError')} onRetry={() => void request.refetch()} />
      </Card>
    );
  }
  if (!request.data) return <Loading label={t('leave.detail.loading')} />;
  const data = request.data;
  return (
    <>
      <Card title={t('leave.approval.title')}>
        <LeaveRequestInfo request={data} />
      </Card>
      {data.balance ? (
        <Card title={t('leave.approval.balanceTitle', { type: data.leaveType.name, name: data.employee.fullName })}>
          <LeaveBalanceFacts request={data} balance={data.balance} />
        </Card>
      ) : null}
      <Card title={data.employee.orgUnitName ? t('leave.approval.unitTitle', { unit: data.employee.orgUnitName }) : t('leave.approval.unitTitleNone')}>
        <LeaveAbsenceList absences={data.unitAbsences} unit={data.employee.orgUnitName} />
      </Card>
    </>
  );
}
