// Chấm công (HRM-39): the mobile check-in, reached from the Chấm công hôm nay card. The consent to the notice comes
// first; with it in force the camera step takes the photo and sends the punch (HRM-39/FE-2). Only for an Account with an
// active Employee.
import { ArrowLeft, UserX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { StateBlock } from '@/components/ui/state-block';
import { CheckinConsentForm } from '@/features/attendance/components/checkin-consent-form';
import { useCheckinConsent } from '@/features/attendance/mobile-checkin-api';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { CheckinCameraStep } from './checkin-camera-step';

function CheckinBody() {
  const { t } = useTranslation();
  const consent = useCheckinConsent();
  if (consent.isPending) return <Loading label={t('state.loading')} />;
  if (consent.error instanceof ApiError && consent.error.status === 403) {
    return (
      <Card bare>
        <StateBlock variant="denied" icon={<UserX />} title={t('mobileCheckin.denied.title')} description={t('mobileCheckin.denied.text')} />
      </Card>
    );
  }
  if (consent.isError) {
    return (
      <Card bare>
        <StateBlock variant="error" title={t('mobileCheckin.loadError')} description={t('state.errorHint')}
          actions={<Button variant="secondary" onClick={() => void consent.refetch()}>{t('state.retry')}</Button>} />
      </Card>
    );
  }
  return consent.data.accepted ? <CheckinCameraStep /> : <CheckinConsentForm consent={consent.data} />;
}

export function CheckinPage() {
  const { t } = useTranslation();
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <Link to="/" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-ml-3 self-start max-md:h-11')}>
        <ArrowLeft aria-hidden="true" className="!size-4" />
        {t('nav.overview')}
      </Link>
      <CheckinBody />
    </div>
  );
}
