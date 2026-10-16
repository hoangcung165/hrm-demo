// Cấu hình nghỉ phép (HRM-18, artboard `#18 Cấu hình nghỉ phép`; Hệ thống › Cấu hình nghỉ phép): the leave types on
// the left, the selected type's policy on the right, or a new type. Needs LEAVE_POLICY_EDIT (Admin, HR by default);
// anyone else gets the denied state. The selected type lives in the URL (`?type=`).
import { ShieldOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Loading } from '@/components/ui/loading';
import { StateBlock } from '@/components/ui/state-block';
import { useCurrentAccount } from '@/features/auth/account-context';
import { useLeaveTypes } from '@/features/leave/policy-api';
import { LeavePoliciesLayout } from './leave-policies-layout';

export function LeavePoliciesPage() {
  const { t } = useTranslation();
  const { permissions } = useCurrentAccount();
  const allowed = permissions.includes('LEAVE_POLICY_EDIT');
  const types = useLeaveTypes(true, allowed);
  let body;
  if (!allowed) {
    body = (
      <Card bare>
        <StateBlock variant="denied" icon={<ShieldOff />} title={t('leave.policy.denied')} description={t('leave.policy.deniedText')} />
      </Card>
    );
  } else if (types.isError) {
    body = (
      <Card bare>
        <ErrorState title={t('leave.policy.loadError')} description={t('state.errorHint')} onRetry={() => void types.refetch()} />
      </Card>
    );
  } else if (!types.data) body = <Loading label={t('leave.policy.loading')} rows={5} />;
  else body = <LeavePoliciesLayout types={types.data.items} />;
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-title">{t('leave.policy.title')}</h1>
        <p className="text-body-small text-ink-muted">{t('leave.policy.intro')}</p>
      </div>
      {body}
    </div>
  );
}
