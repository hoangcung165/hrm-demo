import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { useResetPassword } from '@/features/auth/api';
import { AuthHeading } from '@/features/auth/components/auth-heading';
import { errorMessage } from '@/features/auth/error-message';
import { resetPasswordSchema, type ResetPasswordValues } from '@/features/auth/schemas';
import { ApiError } from '@/lib/api';
import { LinkExpiredPanel } from './link-expired-panel';

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = useSearchParams()[0].get('token');
  const reset = useResetPassword();
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const linkInvalid = reset.error instanceof ApiError && reset.error.code === 'auth.reset_token_invalid';
  if (!token || linkInvalid) return <LinkExpiredPanel />;

  const onSubmit = form.handleSubmit((values) =>
    reset.mutate(
      { token, newPassword: values.newPassword },
      { onSuccess: () => navigate('/login', { replace: true }) },
    ),
  );

  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
        <AuthHeading title={t('auth.reset.title')}>{t('auth.reset.hint')}</AuthHeading>
        {reset.isError ? <Alert variant="danger" title={errorMessage(reset.error, t)} /> : null}
        <div className="flex flex-col gap-4">
          <FormField<ResetPasswordValues> name="newPassword" type="password" label={t('auth.newPassword')} helper={t('auth.passwordHelper')} autoComplete="new-password" />
          <FormField<ResetPasswordValues> name="confirmPassword" type="password" label={t('auth.confirmPassword')} autoComplete="new-password" />
        </div>
        <Button type="submit" disabled={reset.isPending} className="w-full">
          {t('auth.reset.submit')}
        </Button>
      </form>
    </FormProvider>
  );
}
