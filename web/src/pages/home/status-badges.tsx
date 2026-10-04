import { CircleCheck, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';

export function StatusBadges() {
  const { t } = useTranslation();
  return (
    <section className="flex flex-wrap gap-3">
      <Badge variant="success"><CircleCheck />{t('home.status.approved')}</Badge>
      <Badge variant="warning">{t('home.status.pending')}</Badge>
      <Badge variant="danger"><TriangleAlert />{t('home.status.rejected')}</Badge>
    </section>
  );
}
