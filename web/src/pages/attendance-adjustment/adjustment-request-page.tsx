// Đơn bổ sung công (HRM-24), `/attendance/adjustments/:id`: the request for its sender, with "Hủy đơn" and "Sửa và gửi
// lại", and for the people its approval request lets in. Not found for anyone else.
import { ArrowLeft, SearchX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Loading } from '@/components/ui/loading';
import { StateBlock } from '@/components/ui/state-block';
import { useAdjustment } from '@/features/attendance/adjustment-api';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { AdjustmentRequestView } from './adjustment-request-view';

export function AdjustmentRequestPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const request = useAdjustment(id);
  const notFound = request.error instanceof ApiError && [400, 403, 404].includes(request.error.status);
  return (
    <div className="flex flex-col gap-4">
      <Link to={request.data ? `/attendance?from=${request.data.date}&to=${request.data.date}` : '/attendance'} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-ml-3 self-start max-md:h-11')}>
        <ArrowLeft aria-hidden="true" className="!size-4" />
        {t('attendanceImport.daily')}
      </Link>
      {request.data ? (
        <AdjustmentRequestView request={request.data} />
      ) : notFound ? (
        <Card bare>
          <StateBlock variant="plain" icon={<SearchX />} title={t('attendanceAdjustment.notFound')} description={t('attendanceAdjustment.notFoundText')} />
        </Card>
      ) : request.isError ? (
        <Card bare>
          <ErrorState title={t('attendanceAdjustment.loadError')} onRetry={() => void request.refetch()} />
        </Card>
      ) : (
        <Loading label={t('attendanceAdjustment.loading')} />
      )}
    </div>
  );
}
