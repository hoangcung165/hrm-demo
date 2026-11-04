// "Chấm công hôm nay" (HRM-39, artboards `#39 Tổng quan: Chấm công (390)` and `#39 Đã chấm công (390)`): today's
// shift, the status, today's punches and the way in to a mobile check-in. The check-in starts on `/checkin`, which
// asks for the consent first when it is not in force. An Account whose Employee cannot check in (403) sees no card.
import { CircleCheck, Clock, LogIn, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { CheckinCard } from '@/components/ui/checkin-card';
import { ApiError } from '@/lib/api';
import { companyTodayIso } from '@/lib/company-time';
import { formatDayMonth } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useCheckinToday, type CheckinToday } from '../mobile-checkin-api';
import { checkinStatus, needsReview } from '../mobile-checkin-model';
import { CheckinPunchList } from './checkin-punch-list';

export type TodayCheckinCardProps = { className?: string };

function ShiftLine({ today }: { today: CheckinToday }) {
  const { t } = useTranslation();
  const { shift } = today;
  // Yesterday's night shift is still open: the card says which day it is about.
  const day = today.date === companyTodayIso() ? '' : ` · ${formatDayMonth(today.date)}`;
  return (
    <p className="flex items-center gap-2 text-body-small">
      <Clock aria-hidden="true" className="size-4 shrink-0 stroke-[1.5] text-ink-muted" />
      {shift ? (
        <span>
          {shift.name} <span className="tabular-nums">{`${shift.startTime} – ${shift.endTime}`}</span>
          {day}
        </span>
      ) : (
        <span className="text-ink-muted">{t('mobileCheckin.card.noShift')}{day}</span>
      )}
    </p>
  );
}

function StatusBadge({ today }: { today: CheckinToday }) {
  const { t } = useTranslation();
  const status = checkinStatus(today);
  if (status === 'none') return <Badge variant="neutral">{t('mobileCheckin.card.status.none')}</Badge>;
  return (
    <Badge variant="success">
      <CircleCheck aria-hidden="true" />
      {t(`mobileCheckin.card.status.${status}`)}
    </Badge>
  );
}

export function TodayCheckinCard({ className }: TodayCheckinCardProps) {
  const { t } = useTranslation();
  const today = useCheckinToday();
  const title = t('mobileCheckin.card.title');
  if (today.isPending) return <CheckinCard title={title} busy className={className} />;
  if (today.error instanceof ApiError && today.error.status === 403) return null;
  if (today.isError || !today.data) {
    return (
      <CheckinCard title={title} className={className} action={<Button variant="secondary" onClick={() => void today.refetch()}>{t('state.retry')}</Button>}>
        <p role="alert" className="text-body-small text-danger">{t('mobileCheckin.card.loadError')}</p>
      </CheckinCard>
    );
  }
  const data = today.data;
  const out = data.nextLabel === 'OUT';
  const Icon = out ? LogOut : LogIn;
  return (
    <CheckinCard
      title={title}
      status={<StatusBadge today={data} />}
      className={className}
      action={
        <Link to="/checkin" className={cn(buttonVariants({ variant: out ? 'secondary' : 'primary' }))}>
          <Icon aria-hidden="true" />
          {t(`mobileCheckin.card.action.${data.nextLabel}`)}
        </Link>
      }
      note={needsReview(data.punches) ? t('mobileCheckin.card.reviewNote') : t('mobileCheckin.card.note')}
    >
      <ShiftLine today={data} />
      {data.punches.length > 0 ? <CheckinPunchList punches={data.punches} /> : null}
    </CheckinCard>
  );
}
