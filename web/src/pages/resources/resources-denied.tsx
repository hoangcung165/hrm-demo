// No RESOURCE_VIEW (or the API refused it): the page is not shown.
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StateBlock } from '@/components/ui/state-block';

export function ResourcesDenied() {
  const { t } = useTranslation();
  return (
    <Card bare>
      <StateBlock
        variant="denied"
        title={t('resources.denied.title')}
        description={t('resources.denied.text')}
        actions={
          <Link to="/" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
            {t('resources.denied.home')}
          </Link>
        }
      />
    </Card>
  );
}
