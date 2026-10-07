// One profile card edited in place: its form (starting from the profile), its PUT, and what follows a save.
// Field errors from the server go under their fields and the first takes focus; 403 or 404 closes the card with a
// toast and reloads the profile; anything else keeps the changes and says to try again.
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/api';
import { EMPLOYEES_KEY, type EmployeeProfile } from './api';
import { profileToValues } from './edit-requests';
import { useSaveProfilePart, type ProfilePart, type ProfilePartBody } from './form-api';
import { useProfileEdit } from './profile-edit-context';
import type { EmployeeFormField, EmployeeFormSchema, EmployeeFormValues } from './schemas';
import { serverFieldErrors, type ServerErrorOptions, type ServerFieldError } from './server-errors';

export type ProfileCardFormOptions<P extends ProfilePart> = {
  employee: EmployeeProfile;
  part: P;
  schema: EmployeeFormSchema;
  toBody: (values: EmployeeFormValues) => ProfilePartBody[P];
  paths: ServerErrorOptions['paths'];
  /** Where a field that is not on screen shows its error, for these values. */
  onScreen?: (values: EmployeeFormValues) => ServerErrorOptions['onScreen'];
  /** A 403 that is about one field (a unit outside the caller's scope): that field and its message, or null. */
  forbidden?: (values: EmployeeFormValues) => ServerFieldError | null;
  /** The field that takes focus when the card opens. */
  first: EmployeeFormField;
};

export function useProfileCardForm<P extends ProfilePart>({ employee, part, schema, toBody, paths, onScreen, forbidden, first }: ProfileCardFormOptions<P>) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const edit = useProfileEdit();
  const save = useSaveProfilePart(employee.id, part);
  const form = useForm<EmployeeFormValues>({ resolver: zodResolver(schema), defaultValues: profileToValues(employee), mode: 'onTouched' });
  const [errorValues, setErrorValues] = useState<Partial<Record<EmployeeFormField, Record<string, string>>>>({});
  const names = { part: t(`employees.edit.part.${part}`), name: employee.fullName };

  const { isDirty } = form.formState;
  const { setDirty } = edit;
  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);
  useEffect(() => {
    form.setFocus(first);
    // Only when the card opens.
  }, []);

  const submit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync(toBody(values));
      toast({ variant: 'success', message: t('employees.edit.saved', names) });
      edit.stop();
    } catch (error) {
      const refusedField = error instanceof ApiError && error.status === 403 ? forbidden?.(values) : null;
      const fields = refusedField ? [refusedField] : serverFieldErrors(error, { paths, onScreen: onScreen?.(values) });
      if (fields.length > 0) {
        setErrorValues(Object.fromEntries(fields.map((each) => [each.field, each.values ?? {}])));
        for (const { field, message } of fields) form.setError(field, { type: 'server', message });
        form.setFocus(fields[0]!.field);
        return;
      }
      if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
        // The Employee went out of reach, or away: the card closes and the profile shows what is true now.
        toast({ variant: 'danger', message: t('employees.edit.refused', names), detail: t(error.status === 403 ? 'error.auth.forbidden' : 'employees.profile.notFound.title') });
        edit.stop();
        await queryClient.invalidateQueries({ queryKey: [...EMPLOYEES_KEY, 'profile', employee.id] });
        return;
      }
      toast({ variant: 'danger', message: t('employees.edit.failed', names) });
    }
  });

  return {
    form,
    submit,
    saving: save.isPending,
    errorValues,
    /** Back to the read view without saving. */
    cancel: edit.stop,
    /** The fields that differ from the profile. */
    changed: Object.keys(form.formState.dirtyFields) as EmployeeFormField[],
    /** Fields with an error after a save was tried. */
    errorCount: form.formState.submitCount > 0 ? Object.keys(form.formState.errors).length : 0,
  };
}

export type ProfileCardForm = ReturnType<typeof useProfileCardForm>;
