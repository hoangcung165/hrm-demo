// No PROJECT_VIEW (or the API refused it): the list is not shown.
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StateBlock } from '@/components/ui/state-block';

export function ProjectListDenied() {
  const { t } = useTranslation();
  return (
    <Card bare>
      <StateBlock
        variant="denied"
        title={t('projects.denied.title')}
        description={t('projects.denied.text')}
        actions={
          <Link to="/" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
            {t('projects.denied.home')}
          </Link>
        }
      />
    </Card>
  );
}
