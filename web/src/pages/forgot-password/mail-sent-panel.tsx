import { Mail } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { AuthHeading } from '@/features/auth/components/auth-heading';
import { BackToLogin } from '@/features/auth/components/back-to-login';

export type MailSentPanelProps = { email: string; pending: boolean; onResend: () => void };

// The API never says whether the email belongs to an Account, so the copy does not either.
export function MailSentPanel({ email, pending, onResend }: MailSentPanelProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-6">
      <AuthHeading
        title={t('auth.sent.title')}
        mark={
          <span aria-hidden="true" className="mb-4 grid size-12 place-items-center rounded-full bg-brand-teal-soft text-success">
            <Mail className="size-5 stroke-[1.5]" />
          </span>
        }
      >
        <Trans i18nKey="auth.sent.text" values={{ email }} components={{ strong: <span className="font-medium text-ink" /> }} />
      </AuthHeading>
      <Button variant="secondary" disabled={pending} onClick={onResend} className="w-full">
        {t('auth.sent.resend')}
      </Button>
      <BackToLogin />
    </div>
  );
}
