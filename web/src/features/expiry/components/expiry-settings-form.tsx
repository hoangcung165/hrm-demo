import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { UnsavedChangesGuard } from '@/components/layout/unsaved-changes-guard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/api';
import { EXPIRY_TYPES, useSaveExpirySettings, type ExpirySettings } from '../api';
import { expirySettingsSchema, toAdvanceDays, toSettingsValues, type ExpirySettingsValues } from '../settings-schema';

export type ExpirySettingsFormProps = { settings: ExpirySettings };

export function ExpirySettingsForm({ settings }: ExpirySettingsFormProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const save = useSaveExpirySettings();
  const form = useForm<ExpirySettingsValues>({ resolver: zodResolver(expirySettingsSchema), defaultValues: toSettingsValues(settings.advanceDays), mode: 'onTouched' });
  const dirty = form.formState.isDirty;
  useEffect(() => {
    if (!form.formState.isDirty) form.reset(toSettingsValues(settings.advanceDays));
  }, [settings.advanceDays, form.reset]);
  const focusFirstInvalid = (values: ExpirySettingsValues) => {
    const parsed = expirySettingsSchema.safeParse(values);
    if (parsed.success) return;
    const first = EXPIRY_TYPES.find((type) => parsed.error.issues.some((issue) => issue.path[0] === type));
    if (first) window.setTimeout(() => document.getElementById(`expiry-days-${first}`)?.focus(), 0);
  };
  const submit = form.handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync(toAdvanceDays(values));
      form.reset(toSettingsValues(saved.advanceDays));
      toast({ variant: 'success', message: t('expiry.settings.saved') });
    } catch (error) {
      if (error instanceof ApiError && error.status === 400 && error.fieldErrors.length) {
        const field = error.fieldErrors.map(({ field }) => field.replace(/^advanceDays\./, '')).find((key) => EXPIRY_TYPES.includes(key as typeof EXPIRY_TYPES[number]));
        if (field) {
          form.setError(field as typeof EXPIRY_TYPES[number], { message: t('expiry.settings.range') });
          form.setFocus(field as typeof EXPIRY_TYPES[number]);
          return;
        }
      }
      toast({ variant: 'danger', message: t('expiry.settings.saveFailed') });
    }
  }, (errors) => {
    const first = EXPIRY_TYPES.find((type) => errors[type]);
    if (first) window.setTimeout(() => document.getElementById(`expiry-days-${first}`)?.focus(), 0);
  });
  return <>
    <form noValidate onSubmit={(event) => void submit(event)}>
      <Card title={t('expiry.settings.formTitle')} description={t('expiry.settings.help')} actions={settings.canEdit ? <>
        <Button variant="secondary" disabled={!dirty || save.isPending} onClick={() => { form.reset(undefined, { keepFieldsRef: true }); form.setFocus('CONTRACT'); }}>{t('expiry.settings.discard')}</Button>
        <Button type="submit" disabled={!dirty || save.isPending} aria-busy={save.isPending || undefined} onClick={() => focusFirstInvalid(form.getValues())}>{t('expiry.settings.save')}</Button>
      </> : null}>
        <div className="grid gap-4 sm:grid-cols-2">
          {EXPIRY_TYPES.map((type) => {
            const error = form.formState.errors[type];
            return <div key={type} className="flex flex-col gap-1">
              <label htmlFor={`expiry-days-${type}`} className="text-body-small font-medium">{t(`expiry.type.${type}`)}</label>
              <div className="flex items-center gap-2">
                <input id={`expiry-days-${type}`} type="text" inputMode="numeric" autoComplete="off" disabled={!settings.canEdit || save.isPending}
                  aria-invalid={Boolean(error)} aria-describedby={error ? `expiry-error-${type}` : undefined}
                  className="h-11 w-24 rounded-sm border border-line bg-surface px-3 tabular-nums focus-visible:shadow-focus-ring disabled:bg-surface-muted"
                  {...form.register(type)} />
                <span className="text-body-small text-ink-muted">{t('expiry.settings.unit')}</span>
              </div>
              {error ? <p id={`expiry-error-${type}`} role="alert" className="text-body-small text-danger">{t('expiry.settings.range')}</p> : null}
            </div>;
          })}
        </div>
        {!settings.canEdit ? <p className="text-body-small text-ink-muted">{t('expiry.settings.readOnly')}</p> : null}
      </Card>
    </form>
    <UnsavedChangesGuard when={dirty && settings.canEdit} title={t('expiry.settings.leaveTitle')} description={t('expiry.settings.leaveText')} confirmLabel={t('expiry.settings.leaveConfirm')} />
  </>;
}
