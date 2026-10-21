import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { StateBlock } from '@/components/ui/state-block';
import { useCurrentAccount } from '@/features/auth/account-context';
import { useExpirySettings } from '@/features/expiry/api';
import { ExpirySettingsForm } from '@/features/expiry/components/expiry-settings-form';
import { ApiError } from '@/lib/api';

export function ExpirySettingsPage() {
  const { t } = useTranslation();
  const { permissions } = useCurrentAccount();
  const allowed = permissions.includes('COMPANY_VIEW');
  const canViewList = permissions.includes('EMPLOYEE_VIEW') && permissions.includes('EMPLOYEE_SENSITIVE_VIEW');
  const settings = useExpirySettings(allowed);
  const denied = !allowed || (settings.error instanceof ApiError && settings.error.status === 403);
  return <div className="flex max-w-180 flex-col gap-6">
    <div className="flex flex-col gap-1">
      <h1 className="text-title">{t('expiry.settings.title')}</h1>
      <p className="text-body-small text-ink-muted">{t('expiry.settings.intro')}</p>
      <Link to={canViewList ? '/expiry' : '/'} className={buttonVariants({ variant: 'secondary', size: 'sm' }) + ' mt-3 self-start'}>{t(canViewList ? 'expiry.settings.back' : 'expiry.settings.backHome')}</Link>
    </div>
    {denied ? <Card bare><StateBlock variant="denied" title={t('expiry.settings.deniedTitle')} description={t('expiry.settings.deniedText')} /></Card>
      : settings.isPending ? <Card busy label={t('expiry.settings.loading')}><p role="status">{t('expiry.settings.loading')}</p></Card>
      : settings.isError ? <Card bare><ErrorState title={t('expiry.settings.loadError')} onRetry={() => void settings.refetch()} /></Card>
      : <ExpirySettingsForm settings={settings.data} />}
  </div>;
}
