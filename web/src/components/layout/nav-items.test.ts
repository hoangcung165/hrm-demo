import type { Permission, Role } from '@/features/auth/account';
import { visibleNavGroups } from './nav-items';

const BASE: Permission[] = ['COMPANY_VIEW', 'ACCOUNT_VIEW'];
const groups = (roles: Role[], permissions: Permission[] = BASE) => visibleNavGroups({ roles, permissions });
const ids = (roles: Role[], permissions?: Permission[]) => groups(roles, permissions).flatMap((group) => group.items.map((item) => item.id));

describe('visibleNavGroups', () => {
  it('shows an Employee only the self-service items and drops empty groups', () => {
    expect(ids(['EMPLOYEE'])).toEqual(['overview', 'leave', 'attendance']);
    expect(groups(['EMPLOYEE']).map((group) => group.id)).toEqual(['main', 'time']);
  });

  it('shows an Admin every item', () => {
    expect(ids(['ADMIN'], [...BASE, 'COMPANY_EDIT', 'ACCOUNT_LIST', 'ACCOUNT_EDIT', 'ORG_VIEW', 'ORG_EDIT', 'EMPLOYEE_VIEW', 'CATALOG_EDIT', 'PROJECT_VIEW'])).toEqual([
      'overview', 'employees', 'contracts', 'org', 'projects', 'leave', 'attendance', 'payroll', 'accounts', 'catalogs', 'company',
    ]);
  });

  it('merges the items of several roles', () => {
    expect(ids(['ACCOUNTANT', 'PROJECT_MANAGER'], [...BASE, 'PROJECT_VIEW'])).toEqual(['overview', 'projects', 'leave', 'attendance', 'payroll']);
  });

  it('shows employees, org, projects, accounts, catalogs and company by permission, whatever the roles', () => {
    // An Admin whose permissions were taken away loses the six items; the role-list items stay.
    expect(ids(['ADMIN'])).toEqual(['overview', 'contracts', 'leave', 'attendance', 'payroll']);
    expect(ids(['EMPLOYEE'], [...BASE, 'PROJECT_VIEW'])).toEqual(['overview', 'projects', 'leave', 'attendance']);
    expect(ids(['PROJECT_MANAGER'])).toEqual(['overview', 'leave', 'attendance']);
    expect(ids(['EMPLOYEE'], [...BASE, 'EMPLOYEE_VIEW'])).toEqual(['overview', 'employees', 'leave', 'attendance']);
    expect(ids(['EMPLOYEE'], [...BASE, 'CATALOG_EDIT'])).toEqual(['overview', 'leave', 'attendance', 'catalogs']);
    expect(ids(['EMPLOYEE'], [...BASE, 'ORG_VIEW'])).toEqual(['overview', 'org', 'leave', 'attendance']);
    expect(ids(['EMPLOYEE'], [...BASE, 'ACCOUNT_LIST'])).toEqual(['overview', 'leave', 'attendance', 'accounts']);
    expect(ids(['EMPLOYEE'], [...BASE, 'COMPANY_EDIT'])).toEqual(['overview', 'leave', 'attendance', 'company']);
    // Editing without viewing does not open the page.
    expect(ids(['EMPLOYEE'], [...BASE, 'ORG_EDIT', 'ACCOUNT_EDIT', 'EMPLOYEE_EDIT'])).toEqual(['overview', 'leave', 'attendance']);
  });

  it('shows the approval inbox to every Account linked to an Employee, whatever the roles', () => {
    const linked = (roles: Role[]) => visibleNavGroups({ roles, permissions: BASE, employeeId: 'e1' }).flatMap((group) => group.items.map((item) => item.id));
    expect(linked(['EMPLOYEE'])).toEqual(['overview', 'leave', 'attendance', 'approvals']);
    expect(linked(['HR'])).toContain('approvals');
    // The first Admin has no Employee: the inbox would refuse it.
    expect(ids(['ADMIN'])).not.toContain('approvals');
  });
});
