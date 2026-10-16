// No AUDIT_VIEW (or the API refused it): the log is not shown.
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StateBlock } from '@/components/ui/state-block';

export function AuditLogDenied() {
  const { t } = useTranslation();
  return (
    <Card bare>
      <StateBlock
        variant="denied"
        title={t('audit.denied.title')}
        description={t('audit.denied.text')}
        actions={
          <Link to="/" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
            {t('audit.denied.home')}
          </Link>
        }
      />
    </Card>
  );
}
