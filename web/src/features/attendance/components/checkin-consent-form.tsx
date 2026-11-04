// Đồng ý lần đầu (HRM-39, artboard `#39 Đồng ý lần đầu (390)`): before the first mobile check-in, or again after a
// withdrawal or a new wording, the Employee reads the notice and accepts it. Nothing is read from the phone here.
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Alert } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useCompany } from '@/features/company/api';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAcceptCheckinConsent, useCheckinConsent, type CheckinConsent } from '../mobile-checkin-api';
import { CheckinConsentNotice } from './checkin-consent-notice';

export type CheckinConsentFormProps = { consent: CheckinConsent };

const outdated = (error: unknown) => error instanceof ApiError && error.fieldErrors.some((each) => each.field === 'noticeVersion' && each.code === 'outdated');

export function CheckinConsentForm({ consent }: CheckinConsentFormProps) {
  const { t } = useTranslation();
  const company = useCompany();
  const accept = useAcceptCheckinConsent();
  const reload = useCheckinConsent();
  const [agreed, setAgreed] = useState(false);
  const [missing, setMissing] = useState(false);
  const errorId = useId();
  // Accepted once before: withdrawn, or the wording changed since.
  const again = consent.acceptedAt !== null;

  const submit = () => {
    if (!agreed) {
      setMissing(true);
      return;
    }
    accept.mutate(consent.currentNoticeVersion, {
      // A new wording was published meanwhile: read it again, the box is ticked anew.
      onError: (error) => {
        if (!outdated(error)) return;
        setAgreed(false);
        void reload.refetch();
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-title">{t(again ? 'mobileCheckin.consent.titleAgain' : 'mobileCheckin.consent.title')}</h1>
        <p className="text-ink-muted">{t('mobileCheckin.consent.intro')}</p>
      </div>
      {accept.isError ? (
        <Alert variant="danger" title={t(outdated(accept.error) ? 'mobileCheckin.consent.outdated.title' : 'mobileCheckin.consent.error.title')}>
          {t(outdated(accept.error) ? 'mobileCheckin.consent.outdated.text' : 'mobileCheckin.consent.error.text')}
        </Alert>
      ) : null}
      <CheckinConsentNotice />
      <div className="flex flex-col gap-1">
        <Checkbox
          checked={agreed}
          onChange={(event) => {
            setAgreed(event.target.checked);
            if (event.target.checked) setMissing(false);
          }}
          aria-invalid={missing || undefined}
          aria-describedby={missing ? errorId : undefined}
          className="min-h-11 items-start [&>span:first-of-type]:mt-0.5"
        >
          <span>{t('mobileCheckin.consent.agree', { company: company.data?.name ?? t('mobileCheckin.consent.theCompany') })}</span>
        </Checkbox>
        {missing ? (
          <span id={errorId} role="alert" className="text-caption text-danger">
            {t('mobileCheckin.consent.agreeRequired')}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 border-t border-line pt-4 md:flex-row-reverse md:justify-start">
        <Button onClick={submit} disabled={accept.isPending} className="max-md:h-11">
          {t('mobileCheckin.consent.accept')}
        </Button>
        <Link to="/" className={cn(buttonVariants({ variant: 'secondary' }), 'max-md:h-11')}>
          {t('mobileCheckin.consent.later')}
        </Link>
      </div>
      <p className="text-caption text-ink-muted max-md:text-center">{t('mobileCheckin.consent.withdrawHint')}</p>
    </div>
  );
}
