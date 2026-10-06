// "Đặt mật khẩu tạm cho {tên}": one field. The Admin types the password to hand over, so it starts shown;
// there is no "repeat" field. The dialog stays open until the save succeeds.
import { zodResolver } from '@hookform/resolvers/zod';
import { useId, type RefObject } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { ApiError } from '@/lib/api';
import type { AccountRow } from '../api';
import { accountPasswordSchema, PASSWORD_MAX, passwordMessage, type AccountPasswordValues } from '../schemas';

export type AccountPasswordDialogProps = {
  account: AccountRow;
  /** True while the call runs. */
  saving: boolean;
  /** Resolves to whether the password was set; rejects with the server's `validation.invalid`. */
  onSubmit: (password: string) => Promise<boolean>;
  onClose: () => void;
  fallbackFocus?: RefObject<HTMLElement | null>;
};

export function AccountPasswordDialog({ account, saving, onSubmit, onClose, fallbackFocus }: AccountPasswordDialogProps) {
  const { t } = useTranslation();
  const formId = useId();
  // Checked on submit, then as the text changes: the field loses focus for a moment while the row menu closes,
  // and checking on blur would call the empty field an error as the dialog opens.
  const form = useForm<AccountPasswordValues>({ resolver: zodResolver(accountPasswordSchema), defaultValues: { password: '' } });
  const submit = form.handleSubmit(async ({ password }) => {
    try {
      if (await onSubmit(password)) onClose();
    } catch (error) {
      const code = error instanceof ApiError ? error.fieldErrors.find((field) => field.field === 'password')?.code : undefined;
      form.setError('password', { type: 'server', message: passwordMessage(code, password) ?? 'error.validation.invalid' });
      form.setFocus('password');
    }
  });
  const name = account.fullName;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t('accounts.password.title', { name })}
      description={t('accounts.password.text', { name })}
      fallbackFocus={fallbackFocus}
      busy={saving}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('dialog.cancel')}
          </Button>
          <Button type="submit" form={formId} disabled={saving}>
            {t('accounts.password.submit')}
          </Button>
        </>
      }
    >
      <FormProvider {...form}>
        <form id={formId} noValidate onSubmit={submit}>
          <FormField<AccountPasswordValues>
            name="password"
            type="password"
            passwordVisible
            label={t('accounts.password.field')}
            helper={t('accounts.password.helper')}
            required
            // One more than the limit, so a password that is too long is said to be, not silently cut.
            maxLength={PASSWORD_MAX + 1}
            autoComplete="new-password"
          />
        </form>
      </FormProvider>
    </Dialog>
  );
}
