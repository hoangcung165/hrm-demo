// The head of a request: back to the inbox, "Yêu cầu 1 / 6" with the previous and next waiting requests, and the
// sender, the type and the status ("Cập nhật hồ sơ của Nguyễn Văn An · Chờ duyệt").
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Avatar } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ApprovalRequestDetail } from '../api';
import type { WaitingNeighbours } from '../use-waiting-neighbours';
import { ApprovalStatusBadge } from './approval-status-badge';

export type ApprovalRequestHeadProps = {
  request: ApprovalRequestDetail;
  neighbours: WaitingNeighbours | null;
  compact: boolean;
};

export function ApprovalRequestHead({ request, neighbours, compact }: ApprovalRequestHeadProps) {
  const { t } = useTranslation();
  const icon = cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'max-md:size-11');
  const disabled = 'pointer-events-none text-ink-muted opacity-50';
  const meta = [request.sender.code, request.sender.orgUnitName, t('approvals.detail.sentAt', { at: formatDateTime(request.sentAt) })].filter(Boolean).join(' · ');
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link to="/approvals" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-ml-3 max-md:h-11')}>
          <ArrowLeft aria-hidden="true" className="!size-4" />
          {t('approvals.detail.back')}
        </Link>
        <span className="flex-1" />
        {neighbours ? (
          <>
            <span className="text-caption text-ink-muted tabular-nums">{t('approvals.detail.position', { index: neighbours.index, total: neighbours.total })}</span>
            {neighbours.previous ? (
              <Link to={`/approvals/${neighbours.previous.id}`} aria-label={t('approvals.detail.previous', { name: neighbours.previous.sender.fullName })} className={icon}>
                <ChevronLeft aria-hidden="true" />
              </Link>
            ) : (
              <span aria-hidden="true" className={cn(icon, disabled)}>
                <ChevronLeft />
              </span>
            )}
            {neighbours.next ? (
              <Link to={`/approvals/${neighbours.next.id}`} aria-label={t('approvals.detail.next', { name: neighbours.next.sender.fullName })} className={icon}>
                <ChevronRight aria-hidden="true" />
              </Link>
            ) : (
              <span aria-hidden="true" className={cn(icon, disabled)}>
                <ChevronRight />
              </span>
            )}
          </>
        ) : null}
      </div>
      <div className="flex items-center gap-3 md:gap-4">
        <Avatar name={request.sender.fullName} size={compact ? 'md' : 'lg'} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-title max-md:text-[20px] max-md:leading-7">
              {t('approvals.detail.title', { type: t(`approvals.type.${request.type}`), name: request.sender.fullName })}
            </h1>
            <ApprovalStatusBadge status={request.status} />
          </div>
          <span className="text-ink-muted tabular-nums max-md:text-caption">{meta}</span>
        </div>
      </div>
    </div>
  );
}
