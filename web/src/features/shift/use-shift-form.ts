// State of the add/edit shift form: values, validation, save, server errors on their fields, and the toasts.
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { errorMessage } from '@/features/auth/error-message';
import { ApiError } from '@/lib/api';
import { useCreateShift, useUpdateShift, type Shift } from './api';
import { shiftFieldErrors } from './field-errors';
import { initialValues, shiftChanged, shiftSchema, toRequest, type ShiftValues } from './schemas';

export type ShiftFormOutcome = {
  onSaved: (shift: Shift) => void;
  /** The save cannot succeed and the dialog has nothing left to do: the shift is gone, or the caller lost the permission. */
  onGone: (reason: 'denied' | 'notFound') => void;
};

/** `shift` is the shift being edited as its list row had it, `null` for a new one. */
export function useShiftForm(shift: Shift | null, { onSaved, onGone }: ShiftFormOutcome) {
  const { t } = useTranslation();
  const toast = useToast();
  const create = useCreateShift();
  const update = useUpdateShift();
  const [initial] = useState(() => initialValues(shift));
  // Fields validate when the user leaves them, then as they correct them; an invalid submit focuses the first invalid field.
  const form = useForm<ShiftValues>({ resolver: zodResolver(shiftSchema), defaultValues: initial, mode: 'onTouched' });
  const values = useWatch({ control: form.control }) as ShiftValues;

  const submit = form.handleSubmit(async (parsed) => {
    const body = toRequest(parsed);
    try {
      const saved = shift ? await update.mutateAsync({ id: shift.id, body }) : await create.mutateAsync(body);
      toast({ variant: 'success', message: t(shift ? 'shifts.form.saved' : 'shifts.form.added', { name: saved.name }) });
      onSaved(saved);
    } catch (error) {
      const fieldErrors = shiftFieldErrors(error);
      if (fieldErrors.length > 0) {
        for (const { field, message } of fieldErrors) form.setError(field, { type: 'server', message });
        form.setFocus(fieldErrors[0]!.field);
        return;
      }
      toast({
        variant: 'danger',
        message: shift ? t('shifts.form.saveFailed', { name: shift.name }) : t('shifts.form.addFailed'),
        detail: errorMessage(error, t),
      });
      if (error instanceof ApiError && error.status === 403) onGone('denied');
      else if (error instanceof ApiError && error.code === 'shift.not_found') onGone('notFound');
    }
  });

  return {
    form,
    submit,
    saving: create.isPending || update.isPending,
    /** Edit: nothing to save yet. */
    unchanged: shift !== null && !shiftChanged(values, shift),
  };
}
