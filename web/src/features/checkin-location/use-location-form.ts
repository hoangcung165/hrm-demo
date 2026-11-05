// State of the add/edit Địa điểm chấm công form: values, validation, save, server errors on their fields, and the toasts.
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { errorMessage } from '@/features/auth/error-message';
import { ApiError } from '@/lib/api';
import { useCreateLocation, useUpdateLocation, type CheckinLocation } from './api';
import { locationFieldErrors } from './field-errors';
import { initialValues, locationChanged, locationSchema, toRequest, type LocationValues } from './schemas';

export type LocationFormOutcome = {
  onSaved: (place: CheckinLocation) => void;
  /** The save cannot succeed and the dialog has nothing left to do: the place is gone, or the caller lost the permission. */
  onGone: (reason: 'denied' | 'notFound') => void;
};

/** `place` is the place being edited as its list row had it, `null` for a new one. */
export function useLocationForm(place: CheckinLocation | null, { onSaved, onGone }: LocationFormOutcome) {
  const { t } = useTranslation();
  const toast = useToast();
  const create = useCreateLocation();
  const update = useUpdateLocation();
  const [initial] = useState(() => initialValues(place));
  // Fields validate when the user leaves them, then as they correct them; an invalid submit focuses the first invalid field.
  const form = useForm<LocationValues>({ resolver: zodResolver(locationSchema), defaultValues: initial, mode: 'onTouched' });
  const values = useWatch({ control: form.control }) as LocationValues;

  const submit = form.handleSubmit(async (parsed) => {
    const body = toRequest(parsed);
    try {
      const saved = place ? await update.mutateAsync({ id: place.id, body }) : await create.mutateAsync(body);
      toast({ variant: 'success', message: t(place ? 'checkinLocations.form.saved' : 'checkinLocations.form.added', { name: saved.name }) });
      onSaved(saved);
    } catch (error) {
      const fieldErrors = locationFieldErrors(error);
      if (fieldErrors.length > 0) {
        for (const { field, message } of fieldErrors) form.setError(field, { type: 'server', message });
        form.setFocus(fieldErrors[0]!.field);
        return;
      }
      toast({
        variant: 'danger',
        message: place ? t('checkinLocations.form.saveFailed', { name: place.name }) : t('checkinLocations.form.addFailed'),
        detail: errorMessage(error, t),
      });
      if (error instanceof ApiError && error.status === 403) onGone('denied');
      else if (error instanceof ApiError && error.code === 'attendance_location.not_found') onGone('notFound');
    }
  });

  return {
    form,
    submit,
    saving: create.isPending || update.isPending,
    /** Edit: nothing to save yet. */
    unchanged: place !== null && !locationChanged(values, place),
  };
}
