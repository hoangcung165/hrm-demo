// Mobile navigation: the sidebar as a drawer over a scrim. Focus trap and Esc come from Radix Dialog.
import { Menu as MenuIcon, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitch } from './language-switch';
import { LogoLink } from './logo-link';
import { SidebarNav } from './sidebar-nav';

const iconButton =
  'grid size-11 shrink-0 cursor-pointer place-items-center rounded-md text-ink hover:bg-surface-muted [&_svg]:size-5 [&_svg]:stroke-[1.5]';

export function MobileNavDrawer() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className={iconButton} aria-label={t('nav.open')}>
        <MenuIcon aria-hidden="true" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <Dialog.Content aria-describedby={undefined} className="fixed inset-y-0 left-0 z-50 flex w-[304px] max-w-[85vw] flex-col bg-surface shadow-lg">
          <Dialog.Title className="sr-only">{t('nav.label')}</Dialog.Title>
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-line pr-2 pl-4">
            <LogoLink className="h-6" onNavigate={close} />
            <Dialog.Close className={iconButton} aria-label={t('nav.close')}>
              <X aria-hidden="true" />
            </Dialog.Close>
          </div>
          <SidebarNav touch onNavigate={close} className="min-h-0 flex-1 overflow-y-auto" />
          <div className="flex shrink-0 border-t border-line p-3">
            <LanguageSwitch variant="secondary" size="md" className="h-11 flex-1" />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
