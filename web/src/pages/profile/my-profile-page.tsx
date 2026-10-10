// "Hồ sơ của tôi" from the Account menu: the Employee's own profile. An Account without an Employee has none.
import { UserX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router';
import { Card } from '@/components/ui/card';
import { StateBlock } from '@/components/ui/state-block';
import { useCurrentAccount } from '@/features/auth/account-context';

export function MyProfilePage() {
  const { t } = useTranslation();
  const { employeeId } = useCurrentAccount();
  if (employeeId) return <Navigate to={`/employees/${employeeId}`} replace />;
  return (
    <Card bare>
      <StateBlock variant="denied" icon={<UserX />} title={t('approvals.noEmployee.title')} description={t('profileUpdate.noEmployee')} />
    </Card>
  );
}
