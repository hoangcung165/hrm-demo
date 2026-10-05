// "Thêm tài khoản" and "Sửa Tài khoản của {tên}": one wide form dialog. It stays open until the save succeeds.
// Closing it with unsaved input just closes, without a confirm: the form is short and nothing was saved.
import { useId, type RefObject } from 'react';
import { FormProvider } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useAccountForm, type AccountFormOutcome, type AccountFormTarget } from '../use-account-form';
import { AccountFormFields } from './account-form-fields';

export type AccountDialogProps = AccountFormOutcome & {
  target: AccountFormTarget;
  onClose: () => void;
  fallbackFocus?: RefObject<HTMLElement | null>;
};

export function AccountDialog({ target, onClose, onSaved, onGone, fallbackFocus }: AccountDialogProps) {
  const { t } = useTranslation();
  const formId = useId();
  const { form, submit, saving, errorValues, unchanged, ownAdmin } = useAccountForm(target, { onSaved, onGone });
  const adding = target.mode === 'add';
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="wide"
      title={adding ? t('accounts.form.addTitle') : t('accounts.form.editTitle', { name: target.account.fullName })}
      description={t(adding ? 'accounts.form.addText' : 'accounts.form.editText')}
      fallbackFocus={fallbackFocus}
      busy={saving}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('dialog.cancel')}
          </Button>
          {/* While saving the button keeps its label and is disabled; an edit has nothing to save until a field changes. */}
          <Button type="submit" form={formId} disabled={saving || unchanged}>
            {t(adding ? 'accounts.form.addSubmit' : 'accounts.form.editSubmit')}
          </Button>
        </>
      }
    >
      <FormProvider {...form}>
        <form id={formId} noValidate onSubmit={submit} className="flex flex-col gap-4">
          <AccountFormFields adding={adding} ownAdmin={ownAdmin} errorValues={errorValues} />
        </form>
      </FormProvider>
    </Dialog>
  );
}
