import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

export function BackToLogin() {
  const { t } = useTranslation();
  return (
    <Link to="/login" className="inline-flex min-h-6 items-center justify-center gap-2 rounded-sm font-medium text-link">
      <ArrowLeft aria-hidden="true" className="size-4 stroke-[1.5]" />
      {t('auth.backToLogin')}
    </Link>
  );
}
