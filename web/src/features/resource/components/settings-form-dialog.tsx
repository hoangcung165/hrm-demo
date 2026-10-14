// The thresholds dialog once the thresholds in force are loaded. It stays open until the save succeeds.
import { useId, type RefObject } from 'react';
import { FormProvider } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import type { ResourceSettings } from '../settings-api';
import { useSettingsForm } from '../use-settings-form';
import { SettingsFields } from './settings-fields';
import { SettingsSummary } from './settings-summary';

export type SettingsFormDialogProps = {
  settings: ResourceSettings;
  onClose: () => void;
  fallbackFocus?: RefObject<HTMLElement | null>;
};

export function SettingsFormDialog({ settings, onClose, fallbackFocus }: SettingsFormDialogProps) {
  const { t } = useTranslation();
  const formId = useId();
  const { form, submit, restoreDefaults, saving, preview, unchanged, atDefaults, nearFull } = useSettingsForm(settings, onClose);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t('resources.settings.title')}
      description={t('resources.settings.description')}
      size="wide"
      fallbackFocus={fallbackFocus}
      busy={saving}
      footer={
        <>
          <Button variant="ghost" className="mr-auto" onClick={restoreDefaults} disabled={saving || atDefaults}>
            {t('resources.settings.restore')}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {t('dialog.cancel')}
          </Button>
          <Button type="submit" form={formId} disabled={saving || unchanged}>
            {t('resources.settings.save')}
          </Button>
        </>
      }
    >
      <FormProvider {...form}>
        <form id={formId} noValidate onSubmit={submit} className="flex flex-col gap-4">
          <SettingsFields nearFull={nearFull} />
        </form>
      </FormProvider>
      <SettingsSummary preview={preview} settings={settings} />
    </Dialog>
  );
}
