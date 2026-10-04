import { LayoutDashboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/format';

// Overview. Empty until there are Employees; the dashboard itself is HRM-20.
export function HomePage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h1 className="text-title">{t('home.title')}</h1>
        <span className="text-ink-muted">{formatDate(new Date())}</span>
      </div>
      <section className="rounded-md border border-line bg-surface py-6">
        <EmptyState icon={<LayoutDashboard />} title={t('home.emptyTitle')} description={t('home.emptyText')} />
      </section>
    </div>
  );
}
