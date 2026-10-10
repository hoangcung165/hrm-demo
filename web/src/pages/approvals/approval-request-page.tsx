// A Yêu cầu phê duyệt opened from the inbox (HRM-12). This slice (FE-1) shows its head: type, sender, status and
// summary; the steps, the log and the decision card come with FE-2.
import { ArrowLeft, SearchX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { Alert } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Loading } from '@/components/ui/loading';
import { StateBlock } from '@/components/ui/state-block';
import { useApprovalRequest } from '@/features/approval/api';
import { ApprovalStatusBadge } from '@/features/approval/components/approval-status-badge';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export function ApprovalRequestPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const request = useApprovalRequest(id);
  const notFound = request.error instanceof ApiError && (request.error.status === 404 || request.error.status === 400);
  const { data } = request;
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
      ) : !data ? (
        <Loading label={t('approvals.loading')} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-title">
              {t(`approvals.type.${data.type}`)} · {data.sender.fullName}
            </h1>
            <ApprovalStatusBadge status={data.status} />
          </div>
          <p className="text-ink-muted tabular-nums">
            {data.summary} · {formatDateTime(data.sentAt)} · {t('approvals.level', { level: data.level, count: data.levelCount })}
          </p>
          <Alert variant="info" title={t('approvals.detail.pending')} />
        </>
      )}
    </div>
  );
}
