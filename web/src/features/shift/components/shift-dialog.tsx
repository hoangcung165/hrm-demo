// "Thêm ca làm việc" and "Sửa ca: {tên}": one form dialog. It stays open until the save succeeds.
// Closing it with unsaved input just closes, without a confirm: nothing was saved yet.
import { useId, type RefObject } from 'react';
import { FormProvider } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import type { Shift } from '../api';
import { useShiftForm, type ShiftFormOutcome } from '../use-shift-form';
import { ShiftFormFields } from './shift-form-fields';

export type ShiftDialogProps = ShiftFormOutcome & {
  /** The shift being edited, `null` for a new one. */
  shift: Shift | null;
  onClose: () => void;
  fallbackFocus?: RefObject<HTMLElement | null>;
};

export function ShiftDialog({ shift, onClose, onSaved, onGone, fallbackFocus }: ShiftDialogProps) {
  const { t } = useTranslation();
  const formId = useId();
  const { form, submit, saving, unchanged } = useShiftForm(shift, { onSaved, onGone });
  const addLabel = t('shifts.add');
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={shift ? t('shifts.form.editTitle', { name: shift.name }) : addLabel}
      fallbackFocus={fallbackFocus}
      busy={saving}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('dialog.cancel')}
          </Button>
          {/* While saving the button keeps its label and is disabled; an edit has nothing to save until a field changes. */}
          <Button type="submit" form={formId} disabled={saving || unchanged}>
            {shift ? t('shifts.form.save') : addLabel}
          </Button>
        </>
      }
    >
      <FormProvider {...form}>
        <form id={formId} noValidate onSubmit={submit} className="flex flex-col gap-4">
          <ShiftFormFields codeLocked={shift !== null} />
        </form>
      </FormProvider>
    </Dialog>
  );
}
