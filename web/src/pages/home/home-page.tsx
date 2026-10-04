import { useTranslation } from 'react-i18next';
import { AppHeader } from '@/components/layout/app-header';
import { ButtonShowcase } from './button-showcase';
import { FormatSamples } from './format-samples';
import { StatusBadges } from './status-badges';

// Sample page for the FE skeleton: tokens, font, shared formatters, vi/en.
export function HomePage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-surface-muted">
      <AppHeader />
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-title">{t('home.title')}</h1>
          <p className="text-ink-muted">{t('home.intro')}</p>
        </div>
        <ButtonShowcase />
        <StatusBadges />
        <FormatSamples />
      </main>
    </div>
  );
}
