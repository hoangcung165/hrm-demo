// Sửa đơn (HRM-18): a request returned to its sender, changed and sent again at the level it was returned from.
// Anything else (still waiting, decided, someone else's) says it cannot be edited.
import { SearchX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Loading } from '@/components/ui/loading';
import { StateBlock } from '@/components/ui/state-block';
import { useLeaveRequest } from '@/features/leave/api';
import { valuesOf } from '@/features/leave/use-leave-form';
import { ApiError } from '@/lib/api';
import { LeaveBackLink } from './leave-back-link';
import { LeaveFormBody } from './leave-form-body';

export function LeaveEditPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const request = useLeaveRequest(id);
  const notFound = request.error instanceof ApiError && [400, 403, 404].includes(request.error.status);
  let body;
  if (request.data?.canEdit) body = <LeaveFormBody key={request.data.id} editing={{ id, values: valuesOf(request.data) }} />;
  else if (request.data || notFound) {
    body = (
      <Card bare>
        <StateBlock variant="plain" icon={<SearchX />} title={t(request.data ? 'leave.edit.notEditable' : 'leave.detail.notFound')} description={t(request.data ? 'leave.edit.notEditableText' : 'leave.detail.notFoundText')} />
      </Card>
    );
  } else if (request.isError) body = <ErrorState title={t('leave.detail.loadError')} onRetry={() => void request.refetch()} />;
  else body = <Loading label={t('leave.detail.loading')} />;
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <LeaveBackLink to={`/leave/requests/${id}`} label={t('leave.detail.title')} />
        <h1 className="text-title">{t('leave.edit.title')}</h1>
      </div>
      {request.data?.canEdit ? <p className="-mt-2 text-body-small text-ink-muted md:-mt-4">{t('leave.edit.intro')}</p> : null}
      {body}
    </div>
  );
}
