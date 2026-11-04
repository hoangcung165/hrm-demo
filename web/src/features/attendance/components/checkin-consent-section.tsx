// "Chấm công bằng điện thoại" on the Employee's own profile (HRM-39, decision 7): whether the consent to the notice
// on location and photo is in force, withdrawing it, or the way to accept it again. Only on one's own profile; an
// Employee who cannot check in (403) sees nothing.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/api';
import { companyDateIso, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useCheckinConsent, useWithdrawCheckinConsent } from '../mobile-checkin-api';

// An instant read as the company's calendar day, whatever the zone of the browser.
const dayOf = (instant: string) => formatDate(companyDateIso(instant));

export function CheckinConsentSection() {
  const { t } = useTranslation();
  const toast = useToast();
  const consent = useCheckinConsent();
  const withdraw = useWithdrawCheckinConsent();
  const [confirming, setConfirming] = useState(false);
  const title = t('mobileCheckin.profile.title');

  if (consent.isPending) return <Card busy label={title}>{null}</Card>;
  if (consent.error instanceof ApiError && consent.error.status === 403) return null;
  if (consent.isError) {
    return (
      <Card title={title} actions={<Button variant="secondary" onClick={() => void consent.refetch()}>{t('state.retry')}</Button>}>
        <p role="alert" className="text-danger">{t('mobileCheckin.profile.loadError')}</p>
      </Card>
    );
  }

  const { accepted, acceptedAt, withdrawnAt } = consent.data;
  const confirm = () =>
    withdraw.mutate(undefined, {
      onSuccess: () => {
        setConfirming(false);
        toast({ variant: 'success', message: t('mobileCheckin.profile.withdrawn') });
      },
      onError: () => {
        setConfirming(false);
        toast({ variant: 'danger', message: t('mobileCheckin.profile.withdrawFailed') });
      },
    });

  return (
    <Card
      title={title}
      titleAside={<Badge variant={accepted ? 'success' : 'neutral'}>{t(accepted ? 'mobileCheckin.profile.accepted' : 'mobileCheckin.profile.notAccepted')}</Badge>}
      actions={
        accepted ? (
          <Button variant="secondary" onClick={() => setConfirming(true)}>{t('mobileCheckin.profile.withdraw')}</Button>
        ) : (
          <Link to="/checkin" className={cn(buttonVariants({ variant: 'secondary' }))}>{t('mobileCheckin.profile.accept')}</Link>
        )
      }
    >
      <p>
        {accepted && acceptedAt
          ? t('mobileCheckin.profile.acceptedText', { date: dayOf(acceptedAt) })
          : withdrawnAt
            ? t('mobileCheckin.profile.withdrawnText', { date: dayOf(withdrawnAt) })
            : t('mobileCheckin.profile.neverText')}
      </p>
      <ConfirmDialog
        open={confirming}
        title={t('mobileCheckin.profile.confirm.title')}
        description={t('mobileCheckin.profile.confirm.text')}
        confirmLabel={t('mobileCheckin.profile.withdraw')}
        pending={withdraw.isPending}
        onConfirm={confirm}
        onCancel={() => setConfirming(false)}
      />
    </Card>
  );
}
