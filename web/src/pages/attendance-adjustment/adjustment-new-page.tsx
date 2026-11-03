// Gửi đơn bổ sung công (HRM-24), `/attendance/adjustments/new?date=YYYY-MM-DD`: an Employee gives the time of a punch
// they forgot on one of their own days. Opened from the day in Công theo ngày; works at 390. Sent, it opens the request.
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Loading } from '@/components/ui/loading';
import { useAdjustmentCheck } from '@/features/attendance/adjustment-api';
import { AdjustmentForm } from '@/features/attendance/components/adjustment-form';
import { dayLabel } from '@/features/attendance/components/daily-cells';
import { useAdjustmentForm } from '@/features/attendance/use-adjustment-form';
import { LeaveApproverPreview } from '@/features/leave/components/leave-approver-preview';
import { cn } from '@/lib/utils';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function AdjustmentNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const date = DAY.test(params.get('date') ?? '') ? params.get('date')! : '';
  const check = useAdjustmentCheck(date);
  const form = useAdjustmentForm({ date, onDone: (request) => navigate(`/attendance/adjustments/${request.id}`) });
  const back = `/attendance?from=${date}&to=${date}`;
  return (
    <div className="flex max-w-200 flex-col gap-4 md:gap-6">
      <div className="flex flex-col items-start gap-2">
        <Link to={date ? back : '/attendance'} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-ml-3 max-md:h-11')}>
          <ArrowLeft aria-hidden="true" className="!size-4" />
          {t('attendanceImport.daily')}
        </Link>
        <h1 className="text-title">{t('attendanceAdjustment.newTitle')}</h1>
        {date ? <p className="text-body-small text-ink-muted">{t('attendanceAdjustment.newIntro', { day: `${dayLabel(date, t)}/${date.slice(0, 4)}` })}</p> : null}
      </div>
      <Card>
        {!date ? (
          <p className="text-body-small">{t('attendanceAdjustment.noDate')}</p>
        ) : check.isError ? (
          <ErrorState title={t('attendanceAdjustment.checkError')} onRetry={() => void check.refetch()} />
        ) : !check.data ? (
          <Loading label={t('attendanceAdjustment.loading')} />
        ) : (
          <AdjustmentForm check={check.data} form={form} approvers={<LeaveApproverPreview approvers={check.data.approvers} />} submitLabel={t('attendanceAdjustment.send')} />
        )}
      </Card>
    </div>
  );
}
