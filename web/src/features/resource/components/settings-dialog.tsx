// "Ngưỡng nguồn lực": reads the thresholds in force, then shows the form. While they load, or when they cannot be read,
// the dialog says so and can only be closed.
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ErrorState } from '@/components/ui/error-state';
import { Loading } from '@/components/ui/loading';
import { useResourceSettings } from '../settings-api';
import { SettingsFormDialog } from './settings-form-dialog';

export type SettingsDialogProps = { onClose: () => void; fallbackFocus?: RefObject<HTMLElement | null> };

export function SettingsDialog({ onClose, fallbackFocus }: SettingsDialogProps) {
  const { t } = useTranslation();
  const settings = useResourceSettings();
  if (settings.data) return <SettingsFormDialog settings={settings.data} onClose={onClose} fallbackFocus={fallbackFocus} />;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t('resources.settings.title')}
      size="wide"
      fallbackFocus={fallbackFocus}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t('dialog.close')}
        </Button>
      }
    >
      {settings.isError ? <ErrorState title={t('resources.settings.loadError')} onRetry={() => void settings.refetch()} /> : <Loading rows={2} />}
    </Dialog>
  );
}
