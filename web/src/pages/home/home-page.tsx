import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { useCurrentAccount } from '@/features/auth/account-context';
import { DashboardApprovals } from '@/features/dashboard/components/dashboard-approvals';
import { DashboardTeam } from '@/features/dashboard/components/dashboard-team';
import { DashboardTiles } from '@/features/dashboard/components/dashboard-tiles';
import { DashboardGreeting } from './dashboard-greeting';

// Tổng quan (HRM-20): one page, blocks by permission and scope. Each block loads and fails on its own; the blocks
// after the tiles are added by the next slices.
export function HomePage() {
  const { t } = useTranslation();
  const account = useCurrentAccount();
  // Someone who may be an approver: linked to an Employee and more than a plain Employee.
  const approver = account.employeeId !== null && account.roles.some((role) => role !== 'EMPLOYEE');
  // "Nhóm của tôi" is for a Quản lý trực tiếp; the API still answers 403 for one who heads no unit, and the block then stays away.
  const teamLead = account.employeeId !== null && account.roles.includes('LINE_MANAGER');
  return (
    <div className="flex flex-col gap-6">
      <DashboardGreeting fullName={account.fullName} />
      {account.employeeId === null ? (
        <Alert variant="info" title={t('dashboard.noEmployee.title')}>
          {t('dashboard.noEmployee.text')}
        </Alert>
      ) : null}
      {account.permissions.includes('EMPLOYEE_VIEW') ? <DashboardTiles withApprovals={approver} /> : null}
      {approver ? <DashboardApprovals /> : null}
      {teamLead ? <DashboardTeam /> : null}
    </div>
  );
}
