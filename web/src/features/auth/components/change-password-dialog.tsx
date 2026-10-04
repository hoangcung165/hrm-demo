// Change password, opened from the Account menu. On success the backend signs the Account out everywhere;
// useChangePassword clears the session, so the route guard shows the login page with a confirmation.
import { zodResolver } from '@hookform/resolvers/zod';
import { useId } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { ApiError } from '@/lib/api';
import { useChangePassword } from '../api';
import { errorMessage } from '../error-message';
import { changePasswordSchema, type ChangePasswordValues } from '../schemas';

export type ChangePasswordDialogProps = { open: boolean; onClose: () => void };

export function ChangePasswordDialog({ open, onClose }: ChangePasswordDialogProps) {
  const { t } = useTranslation();
  const formId = useId();
  const change = useChangePassword();
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const close = () => {
    form.reset();
    change.reset();
    onClose();
  };

  const onSubmit = form.handleSubmit((values) =>
    change.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onError: (error) => {
          if (error instanceof ApiError && error.code === 'auth.current_password_incorrect') {
            form.setError('currentPassword', { message: 'error.auth.current_password_incorrect' }, { shouldFocus: true });
          }
        },
      },
    ),
  );

  const wrongCurrent = change.error instanceof ApiError && change.error.code === 'auth.current_password_incorrect';

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title={t('auth.change.title')}
      description={t('auth.change.hint')}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            {t('dialog.cancel')}
          </Button>
          <Button type="submit" form={formId} disabled={change.isPending}>
            {t('auth.change.submit')}
          </Button>
        </>
      }
    >
      <FormProvider {...form}>
        <form id={formId} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
          {change.isError && !wrongCurrent ? <Alert variant="danger" title={errorMessage(change.error, t)} /> : null}
          <FormField<ChangePasswordValues> name="currentPassword" type="password" label={t('auth.currentPassword')} autoComplete="current-password" />
          <FormField<ChangePasswordValues> name="newPassword" type="password" label={t('auth.newPassword')} helper={t('auth.passwordHelper')} autoComplete="new-password" />
          <FormField<ChangePasswordValues> name="confirmPassword" type="password" label={t('auth.confirmPassword')} autoComplete="new-password" />
        </form>
      </FormProvider>
    </Dialog>
  );
}
