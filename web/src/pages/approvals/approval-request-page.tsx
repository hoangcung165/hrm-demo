// A Yêu cầu phê duyệt opened from the inbox or a notification (HRM-12): loading, not found (or not involved) and
// error states around the detail.
import { ArrowLeft, SearchX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Loading } from '@/components/ui/loading';
import { StateBlock } from '@/components/ui/state-block';
import { useApprovalRequest } from '@/features/approval/api';
import { ApiError } from '@/lib/api';
import { useMediaQuery } from '@/lib/use-media-query';
import { cn } from '@/lib/utils';
import { ApprovalRequestDetailView } from './approval-request-detail';

export function ApprovalRequestPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const compact = useMediaQuery('(max-width: 767px)');
  const request = useApprovalRequest(id);
  const notFound = request.error instanceof ApiError && (request.error.status === 404 || request.error.status === 400);
  if (request.data) return <ApprovalRequestDetailView key={id} request={request.data} compact={compact} />;
  return (
    <div className="flex flex-col gap-4">
      <Link to="/approvals" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-ml-3 self-start max-md:h-11')}>
        <ArrowLeft aria-hidden="true" className="!size-4" />
        {t('approvals.detail.back')}
      </Link>
      {notFound ? (
        <Card bare>
          <StateBlock variant="plain" icon={<SearchX />} title={t('approvals.detail.notFound')} description={t('approvals.detail.notFoundText')} />
        </Card>
      ) : request.isError ? (
        <Card bare>
          <ErrorState title={t('approvals.detail.loadError')} onRetry={() => void request.refetch()} />
        </Card>
      ) : (
        <Loading label={t('approvals.detail.loading')} />
      )}
    </div>
  );
}
