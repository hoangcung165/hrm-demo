import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { useCurrentAccount } from '@/features/auth/account-context';
import { ExpiryListSection } from './expiry-list-section';

export function ExpiryPage() {
  const { t } = useTranslation();
  const canViewSettings = useCurrentAccount().permissions.includes('COMPANY_VIEW');
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-title">{t('expiry.title')}</h1>
        <p className="text-body-small text-ink-muted">{t('expiry.intro')}</p>
        {canViewSettings ? <Link to="/expiry/settings" className={buttonVariants({ variant: 'secondary', size: 'sm' }) + ' mt-3 self-start'}>{t('expiry.settings.title')}</Link> : null}
      </div>
      <ExpiryListSection />
    </div>
  );
}
