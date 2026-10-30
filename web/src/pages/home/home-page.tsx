import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { useCurrentAccount } from '@/features/auth/account-context';
import { DashboardApprovals } from '@/features/dashboard/components/dashboard-approvals';
import { DashboardHeadcount } from '@/features/dashboard/components/dashboard-headcount';
import { DashboardProjects } from '@/features/dashboard/components/dashboard-projects';
import { DashboardResourceTiles } from '@/features/dashboard/components/dashboard-resource-tiles';
import { DashboardTeam } from '@/features/dashboard/components/dashboard-team';
import { DashboardTiles } from '@/features/dashboard/components/dashboard-tiles';
import { DashboardGreeting } from './dashboard-greeting';
import { EmployeeHome } from './employee-home';

// Tổng quan (HRM-20): one page, blocks by permission and scope. Each block loads and fails on its own; the blocks
// after the tiles are added by the next slices.
export function HomePage() {
  const { t } = useTranslation();
  const account = useCurrentAccount();
  // Someone who may be an approver: linked to an Employee and more than a plain Employee.
  const approver = account.employeeId !== null && account.roles.some((role) => role !== 'EMPLOYEE');
  // The resource blocks need RESOURCE_VIEW; the headcount charts also read the Employee list's numbers.
  const resources = account.permissions.includes('RESOURCE_VIEW');
  const headcount = resources && account.permissions.includes('EMPLOYEE_VIEW');
  // "Nhóm của tôi" is for a Quản lý trực tiếp; the API still answers 403 for one who heads no unit, and the block then stays away.
  const teamLead = account.employeeId !== null && account.roles.includes('LINE_MANAGER');
  // The Employee's own home is for an Account linked to an Employee that has no company-wide block.
  const employeeHome = account.employeeId !== null && !approver && !resources && !account.permissions.includes('EMPLOYEE_VIEW');
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
      {resources ? <DashboardResourceTiles /> : null}
      {resources ? <DashboardProjects /> : null}
      {headcount ? <DashboardHeadcount /> : null}
      {teamLead ? <DashboardTeam /> : null}
      {employeeHome ? <EmployeeHome /> : null}
    </div>
  );
}
