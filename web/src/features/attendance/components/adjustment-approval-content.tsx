// What a Đơn bổ sung công asks for, in the approval inbox: the day and its shift, the time(s) given and the reason, and
// the day now beside the day once approved.
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { DetailList } from '@/components/ui/detail-list';
import { ErrorState } from '@/components/ui/error-state';
import { Loading } from '@/components/ui/loading';
import { ApiError } from '@/lib/api';
import { useAdjustment } from '../adjustment-api';
import { adjustmentFacts } from './adjustment-facts';
import { dayLabel } from './daily-cells';
import { AdjustmentDayCompare } from './adjustment-day-compare';

export type AdjustmentApprovalContentProps = { requestId: string; summary: string };

export function AdjustmentApprovalContent({ requestId, summary }: AdjustmentApprovalContentProps) {
  const { t } = useTranslation();
  const query = useAdjustment(requestId);
  if (query.error instanceof ApiError && query.error.status === 404) {
    return (
      <Card title={t('approvals.detail.content.title')}>
        <p className="[overflow-wrap:anywhere]">{summary}</p>
      </Card>
    );
  }
  if (query.isError) {
    return (
      <Card bare>
        <ErrorState title={t('attendanceAdjustment.loadError')} onRetry={() => void query.refetch()} />
      </Card>
    );
  }
  if (!query.data) return <Loading label={t('attendanceAdjustment.loading')} />;
  const request = query.data;
  return (
    <>
      <Card title={t('attendanceAdjustment.approval.title')}>
        <DetailList items={adjustmentFacts(request, t)} />
      </Card>
      <Card title={t('attendanceAdjustment.compare.title')}>
        <AdjustmentDayCompare now={request.dayNow} after={request.dayAfter} caption={t('attendanceAdjustment.compare.caption', { day: dayLabel(request.date, t) })} />
      </Card>
    </>
  );
}
