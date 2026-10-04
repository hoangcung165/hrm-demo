import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, type ButtonProps } from '@/components/ui/button';
import { setLanguage } from '@/i18n';

export type LanguageSwitchProps = Pick<ButtonProps, 'variant' | 'size' | 'className'>;

/** Shows the language it switches to, in that language ("English" while the UI is Vietnamese). */
export function LanguageSwitch({ variant = 'ghost', size = 'sm', className }: LanguageSwitchProps) {
  const { t, i18n } = useTranslation();
  const next = i18n.language === 'vi' ? 'en' : 'vi';
  return (
    <Button variant={variant} size={size} className={className} lang={next} onClick={() => setLanguage(next)}>
      <Globe aria-hidden="true" />
      {t('app.switchTo')}
    </Button>
  );
}
