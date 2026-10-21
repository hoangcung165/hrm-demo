import { useTranslation } from 'react-i18next';
import { ExpiryListSection } from './expiry-list-section';

export function ExpiryPage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-title">{t('expiry.title')}</h1>
        <p className="text-body-small text-ink-muted">{t('expiry.intro')}</p>
      </div>
      <ExpiryListSection />
    </div>
  );
}
