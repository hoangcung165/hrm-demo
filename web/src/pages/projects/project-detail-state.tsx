// The project cannot be shown yet or at all: loading (Skeletons), 404, 403, or a load error.
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { StateBlock } from '@/components/ui/state-block';

export type ProjectDetailStateProps = {
  state: 'loading' | 'notFound' | 'denied' | 'error';
  onRetry?: () => void;
};

export function ProjectDetailState({ state, onRetry }: ProjectDetailStateProps) {
  const { t } = useTranslation();
  if (state === 'loading') {
    return (
      <section role="status" aria-busy="true" aria-label={t('projects.detail.loading')} className="flex flex-col gap-6">
        <span className="flex flex-col gap-3">
          <Skeleton shape="title" className="w-[34%]" />
          <Skeleton className="w-[22%]" />
        </span>
        <div className="flex gap-6 rounded-md border border-line bg-surface p-6">
          <Skeleton className="w-[22%]" />
          <Skeleton className="w-[20%]" />
          <Skeleton className="w-[18%]" />
          <Skeleton className="w-[14%]" />
        </div>
      </section>
    );
  }
  if (state === 'error') {
    return (
      <Card bare>
        <ErrorState title={t('projects.detail.loadError')} onRetry={onRetry} />
      </Card>
    );
  }
  const back = (
    <Link to="/projects" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
      {t('projects.detail.backToList')}
    </Link>
  );
  return (
    <Card bare>
      {state === 'notFound' ? (
        <StateBlock variant="plain" icon={<Search />} title={t('projects.detail.notFoundTitle')} description={t('projects.detail.notFoundText')} actions={back} />
      ) : (
        <StateBlock variant="denied" title={t('projects.denied.title')} description={t('projects.denied.text')} actions={back} />
      )}
    </Card>
  );
}
