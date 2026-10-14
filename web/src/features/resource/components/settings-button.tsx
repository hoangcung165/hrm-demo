// The "Ngưỡng nguồn lực" button in the header of Nguồn lực, for whoever may change them (RESOURCE_EDIT), and its dialog.
import { SlidersHorizontal } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { SettingsDialog } from './settings-dialog';

export function SettingsButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button ref={button} variant="secondary" onClick={() => setOpen(true)}>
        <SlidersHorizontal aria-hidden="true" />
        {t('resources.settings.open')}
      </Button>
      {open ? <SettingsDialog onClose={() => setOpen(false)} fallbackFocus={button} /> : null}
    </>
  );
}
