import { Compass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { EmptyState } from '@/components/ui/empty-state';

// Shown for routes that do not exist yet; the sidebar already links to screens of later issues.
export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <section className="rounded-md border border-line bg-surface py-6">
      <EmptyState
        icon={<Compass />}
        title={t('notFound.title')}
        description={t('notFound.text')}
        actions={
          <Link to="/" className="font-medium text-link">
            {t('notFound.back')}
          </Link>
        }
      />
    </section>
  );
}
