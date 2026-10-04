import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { setLanguage } from '@/i18n';

export function LanguageSwitch() {
  const { t, i18n } = useTranslation();
  const next = i18n.language === 'vi' ? 'en' : 'vi';
  return (
    <Button variant="secondary" size="sm" onClick={() => setLanguage(next)} aria-label={t('app.language')}>
      <Languages />
      {t('app.switchTo')}
    </Button>
  );
}
