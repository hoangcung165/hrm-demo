import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export function ButtonShowcase() {
  const { t } = useTranslation();
  return (
    <section className="flex flex-wrap gap-3 rounded-md border border-line bg-surface p-4 shadow-sm">
      <Button>{t('home.approve')}</Button>
      <Button variant="secondary">{t('home.cancel')}</Button>
      <Button variant="ghost">{t('home.details')}</Button>
      <Button variant="danger">{t('home.terminate')}</Button>
      <Button disabled>{t('home.approve')}</Button>
    </section>
  );
}
