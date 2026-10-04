import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { useForgotPassword } from '@/features/auth/api';
import { AuthHeading } from '@/features/auth/components/auth-heading';
import { BackToLogin } from '@/features/auth/components/back-to-login';
import { errorMessage } from '@/features/auth/error-message';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/features/auth/schemas';
import { MailSentPanel } from './mail-sent-panel';

export function ForgotPasswordPage() {
  const { t, i18n } = useTranslation();
  const forgot = useForgotPassword();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } });

  const send = (email: string) => forgot.mutate({ email, language: i18n.language }, { onSuccess: () => setSentTo(email) });

  if (sentTo) {
    return <MailSentPanel email={sentTo} pending={forgot.isPending} onResend={() => send(sentTo)} />;
  }
  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={form.handleSubmit((values) => send(values.email))} className="flex flex-col gap-6">
        <AuthHeading title={t('auth.forgot.title')}>{t('auth.forgot.hint')}</AuthHeading>
        {forgot.isError ? <Alert variant="danger" title={errorMessage(forgot.error, t)} /> : null}
        <FormField<ForgotPasswordValues> name="email" type="email" label={t('auth.email')} autoComplete="username" />
        <Button type="submit" disabled={forgot.isPending} className="w-full">
          {t('auth.forgot.submit')}
        </Button>
        <BackToLogin />
      </form>
    </FormProvider>
  );
}
