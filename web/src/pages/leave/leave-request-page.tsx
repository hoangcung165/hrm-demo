// Chi tiết đơn nghỉ (HRM-18, artboard `#18 Chi tiết đơn nghỉ (390)`): the request for its sender, with "Hủy đơn" and
// "Sửa đơn", and for the people it copies (read-only, without the approval steps). Not found for anyone else.
import { SearchX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Loading } from '@/components/ui/loading';
import { StateBlock } from '@/components/ui/state-block';
import { useLeaveRequest } from '@/features/leave/api';
import { ApiError } from '@/lib/api';
import { LeaveBackLink } from './leave-back-link';
import { LeaveRequestView } from './leave-request-view';

export function LeaveRequestPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const request = useLeaveRequest(id);
  const notFound = request.error instanceof ApiError && [400, 403, 404].includes(request.error.status);
  if (request.data) return <LeaveRequestView request={request.data} />;
  return (
    <div className="flex flex-col gap-4">
      <LeaveBackLink to="/leave" label={t('leave.title')} />
      {notFound ? (
        <Card bare>
          <StateBlock variant="plain" icon={<SearchX />} title={t('leave.detail.notFound')} description={t('leave.detail.notFoundText')} />
        </Card>
      ) : request.isError ? (
        <Card bare>
          <ErrorState title={t('leave.detail.loadError')} onRetry={() => void request.refetch()} />
        </Card>
      ) : (
        <Loading label={t('leave.detail.loading')} />
      )}
    </div>
  );
}
