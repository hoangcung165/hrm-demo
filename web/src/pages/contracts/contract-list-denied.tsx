// No EMPLOYEE_VIEW + EMPLOYEE_SENSITIVE_VIEW, or the API refused: no contract data is asked for or shown.
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StateBlock } from '@/components/ui/state-block';

export function ContractListDenied() {
  const { t } = useTranslation();
  return (
    <Card bare>
      <StateBlock
        variant="denied"
        title={t('contractList.denied.title')}
        description={t('contractList.denied.text')}
        actions={
          <Link to="/" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
            {t('contractList.denied.home')}
          </Link>
        }
      />
    </Card>
  );
}
