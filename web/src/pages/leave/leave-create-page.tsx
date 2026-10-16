// Tạo đơn nghỉ (HRM-18): the form for a new request. An Account without an Employee cannot send one.
import { useTranslation } from 'react-i18next';
import { useCurrentAccount } from '@/features/auth/account-context';
import { LeaveBackLink } from './leave-back-link';
import { LeaveFormBody } from './leave-form-body';
import { LeaveNoEmployee } from './leave-no-employee';

export function LeaveCreatePage() {
  const { t } = useTranslation();
  const { employeeId } = useCurrentAccount();
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <LeaveBackLink to="/leave" label={t('leave.title')} />
        <h1 className="text-title">{t('leave.create')}</h1>
      </div>
      {employeeId ? <LeaveFormBody /> : <LeaveNoEmployee />}
    </div>
  );
}
