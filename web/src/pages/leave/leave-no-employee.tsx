// An Account without an Employee (the first Admin) has no balance and sends no request; whoever may configure the
// leave types is pointed to "Cấu hình nghỉ phép".
import { UserX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StateBlock } from '@/components/ui/state-block';
import { useCurrentAccount } from '@/features/auth/account-context';

export function LeaveNoEmployee() {
  const { t } = useTranslation();
  const { permissions } = useCurrentAccount();
  const canConfigure = permissions.includes('LEAVE_POLICY_EDIT');
  return (
    <Card bare>
      <StateBlock
        variant="denied"
        icon={<UserX />}
        title={t('leave.noEmployee.title')}
        description={t(canConfigure ? 'leave.noEmployee.textPolicy' : 'leave.noEmployee.text')}
        actions={
          canConfigure ? (
            <Link to="/leave-policies" className={buttonVariants({ variant: 'secondary' })}>
              {t('leave.noEmployee.openPolicies')}
            </Link>
          ) : null
        }
      />
    </Card>
  );
}
