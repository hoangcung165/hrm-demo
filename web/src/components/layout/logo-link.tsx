import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import logoUrl from '@/assets/hrm-logo.svg';
import { cn } from '@/lib/utils';

export type LogoLinkProps = { className?: string; onNavigate?: () => void };

/** The HRM lockup, linking to the overview. */
export function LogoLink({ className, onNavigate }: LogoLinkProps) {
  const { t } = useTranslation();
  return (
    <Link to="/" onClick={onNavigate} aria-label={t('app.home')} className="flex rounded-sm">
      <img src={logoUrl} alt="" className={cn('block h-7 w-auto', className)} />
    </Link>
  );
}
