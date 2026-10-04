import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { useLogin, useLoginNotice } from '@/features/auth/api';
import { AuthHeading } from '@/features/auth/components/auth-heading';
import { errorMessage } from '@/features/auth/error-message';
import { loginSchema, type LoginValues } from '@/features/auth/schemas';

export function LoginPage() {
  const { t } = useTranslation();
  const login = useLogin();
  const notice = useLoginNotice();
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  // On success the session is set and AuthLayout redirects to the page the user came for.
  const onSubmit = form.handleSubmit((values) => login.mutate(values));

  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
        <AuthHeading title={t('auth.login.title')}>{t('auth.login.hint')}</AuthHeading>
        {login.isError ? (
          <Alert variant="danger" title={errorMessage(login.error, t)}>
            {t('auth.login.errorHint')}
          </Alert>
        ) : notice === 'passwordSaved' ? (
          <Alert variant="success" title={t('auth.passwordSaved')} />
        ) : null}
        <div className="flex flex-col gap-4">
          <FormField<LoginValues> name="email" type="email" label={t('auth.email')} autoComplete="username" placeholder="an.nguyen@congty.vn" />
          <FormField<LoginValues> name="password" type="password" label={t('auth.password')} autoComplete="current-password" />
          <Link to="/forgot-password" className="self-end rounded-sm font-medium text-link">
            {t('auth.login.forgot')}
          </Link>
        </div>
        <Button type="submit" disabled={login.isPending} className="w-full">
          {t('auth.login.submit')}
        </Button>
      </form>
    </FormProvider>
  );
}
