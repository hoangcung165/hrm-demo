// No EMPLOYEE_VIEW: the list is not shown. An Account linked to an Employee can still open its own profile.
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StateBlock } from '@/components/ui/state-block';
import { useCurrentAccount } from '@/features/auth/account-context';

export function EmployeeListDenied() {
  const { t } = useTranslation();
  const { employeeId } = useCurrentAccount();
  return (
    <Card bare>
      <StateBlock
        variant="denied"
        title={t('employees.denied.title')}
        description={t('employees.denied.text')}
        actions={
          employeeId ? (
            <Link to={`/employees/${employeeId}`} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
              {t('employees.denied.myProfile')}
            </Link>
          ) : undefined
        }
      />
    </Card>
  );
}
