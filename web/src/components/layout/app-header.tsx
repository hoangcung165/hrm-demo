import { useTranslation } from 'react-i18next';
import { LanguageSwitch } from './language-switch';

export function AppHeader() {
  const { t } = useTranslation();
  return (
    <header className="flex h-16 items-center justify-between border-b border-line bg-surface px-6">
      <span className="text-[24px] tracking-[0.03em] text-brand-blue [font-family:var(--font-brand)]">{t('app.name')}</span>
      <LanguageSwitch />
    </header>
  );
}
