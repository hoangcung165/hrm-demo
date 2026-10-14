// State of the thresholds dialog: values, validation, save, server errors on their fields, and the toast.
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { errorMessage } from '@/features/auth/error-message';
import { ApiError } from '@/lib/api';
import type { ResourceThresholds } from './api';
import { DEFAULT_RESOURCE_THRESHOLDS, useSaveResourceSettings, type ResourceSettings } from './settings-api';
import { initialValues, sameThresholds, settingsFieldErrors, settingsSchema, toThresholds, type SettingsFormValues } from './settings-schemas';

export function useSettingsForm(settings: ResourceSettings, onDone: () => void) {
  const { t } = useTranslation();
  const toast = useToast();
  const save = useSaveResourceSettings();
  // Fields validate when the user leaves them, then as they correct them; an invalid submit focuses the first invalid field.
  const form = useForm<SettingsFormValues>({ resolver: zodResolver(settingsSchema), defaultValues: initialValues(settings), mode: 'onTouched' });
  const values = useWatch({ control: form.control }) as SettingsFormValues;
  const requested = toThresholds(values);

  const submit = form.handleSubmit(async (parsed) => {
    try {
      await save.mutateAsync(toThresholds(parsed)!);
      toast({ variant: 'success', message: t('resources.settings.saved') });
      onDone();
    } catch (error) {
      const fieldErrors = settingsFieldErrors(error);
      if (fieldErrors.length > 0) {
        for (const { field, message } of fieldErrors) form.setError(field, { type: 'server', message });
        form.setFocus(fieldErrors[0]!.field);
        return;
      }
      toast({ variant: 'danger', message: t('resources.settings.saveFailed'), detail: errorMessage(error, t) });
      if (error instanceof ApiError && error.status === 403) onDone();
    }
  });

  /** Puts the default values in the fields; saving them makes the company follow the defaults again. */
  const restoreDefaults = () => form.reset(initialValues(DEFAULT_RESOURCE_THRESHOLDS));

  const saved: ResourceThresholds = settings;
  return {
    form,
    submit,
    restoreDefaults,
    saving: save.isPending,
    /** The thresholds the preview draws: the fields while they are valid, the saved ones until then. */
    preview: requested ?? saved,
    /** Nothing to save: the fields hold what is saved already, or are not valid yet. */
    unchanged: requested !== null && sameThresholds(requested, saved),
    atDefaults: requested !== null && sameThresholds(requested, DEFAULT_RESOURCE_THRESHOLDS),
    nearFull: values.nearFullPercent,
  };
}
