// "Đề nghị cập nhật hồ sơ": the Employee's contact fields as they want them and a note for the approvers. New, or, for
// a request returned to them, "Sửa và gửi lại" with their proposal filled in. The profile changes only when the last
// level approves; the fields check as the profile does, and the server's refusals land under their fields.
import { zodResolver } from '@hookform/resolvers/zod';
import { useId } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { FormGrid } from '@/components/ui/form-grid';
import { FormGroup } from '@/components/ui/form-group';
import { useToast } from '@/components/ui/use-toast';
import { errorMessage } from '@/features/auth/error-message';
import { ApiError } from '@/lib/api';
import { useSendProfileUpdate } from '../api';
import { inputOf, NOTE_MAX, profileUpdateSchema, SERVER_PATHS, type ProfileUpdateValues } from '../schema';

const SERVER_MESSAGES: Record<string, string> = {
  personalEmail: 'emailInvalid',
  phone: 'phoneInvalid',
  address: 'addressTooLong',
  contactName: 'contactNameTooLong',
  contactRelationship: 'relationshipTooLong',
  contactPhone: 'phoneInvalid',
};

export type ProfileUpdateDialogProps = {
  initial: ProfileUpdateValues;
  /** A returned request: it is changed and sent again at `level`. */
  resubmit?: { id: string; level: number };
  onClose: () => void;
  /** After sending, with the request's id. */
  onSent?: (id: string) => void;
};

/** Mounted while open, so every opening starts from `initial`. */
export function ProfileUpdateDialog({ initial, resubmit, onClose, onSent }: ProfileUpdateDialogProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const formId = useId();
  const send = useSendProfileUpdate();
  const form = useForm<ProfileUpdateValues>({ resolver: zodResolver(profileUpdateSchema), defaultValues: initial });
  const onSubmit = form.handleSubmit((values) =>
    send.mutate(
      { id: resubmit?.id, input: inputOf(values) },
      {
        onSuccess: (saved) => {
          toast({ variant: 'success', message: t(resubmit ? 'profileUpdate.dialog.resent' : 'profileUpdate.dialog.sent') });
          onSent?.(saved.id);
          onClose();
        },
        onError: (error) => {
          if (!(error instanceof ApiError)) return;
          for (const fieldError of error.fieldErrors) {
            const field = SERVER_PATHS[fieldError.field];
            if (field) form.setError(field, { message: `employees.create.error.${SERVER_MESSAGES[field]}` });
          }
        },
      },
    ),
  );
  const fieldErrors = send.error instanceof ApiError && send.error.fieldErrors.length > 0;
  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      size="wide"
      title={t(resubmit ? 'profileUpdate.dialog.resubmitTitle' : 'profileUpdate.dialog.title')}
      description={resubmit ? t('profileUpdate.dialog.resubmitText', { level: resubmit.level }) : t('profileUpdate.dialog.text')}
      busy={send.isPending}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('dialog.cancel')}
          </Button>
          <Button type="submit" form={formId} disabled={send.isPending}>
            {t(resubmit ? 'profileUpdate.dialog.resend' : 'profileUpdate.dialog.send')}
          </Button>
        </>
      }
    >
      <FormProvider {...form}>
        <form id={formId} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
          {send.isError && !fieldErrors ? <Alert variant="danger" title={t('profileUpdate.dialog.failed')}>{errorMessage(send.error, t)}</Alert> : null}
          <FormGrid>
            <FormField<ProfileUpdateValues> name="phone" type="tel" label={t('employees.profile.phone')} placeholder="0912 345 678" autoComplete="tel" />
            <FormField<ProfileUpdateValues> name="personalEmail" type="email" label={t('employees.profile.email')} autoComplete="email" />
          </FormGrid>
          <FormField<ProfileUpdateValues> name="address" label={t('employees.profile.personal.address')} maxLength={500} autoComplete="street-address" />
          <FormGroup legend={t('profileUpdate.dialog.emergency')}>
            <FormGrid>
              <FormField<ProfileUpdateValues> name="contactName" label={t('employees.profile.fullName')} maxLength={150} autoComplete="off" />
              <FormField<ProfileUpdateValues> name="contactRelationship" label={t('employees.profile.personal.relationship')} maxLength={50} autoComplete="off" />
              <FormField<ProfileUpdateValues> name="contactPhone" type="tel" label={t('employees.profile.phone')} placeholder="0912 345 678" autoComplete="off" />
            </FormGrid>
          </FormGroup>
          <FormField<ProfileUpdateValues> name="note" multiline rows={2} maxLength={NOTE_MAX} label={t('profileUpdate.dialog.note')} placeholder={t('profileUpdate.dialog.notePlaceholder')} />
        </form>
      </FormProvider>
    </Dialog>
  );
}
