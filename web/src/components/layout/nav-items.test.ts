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
    expect(ids(['ADMIN'], [...BASE, 'COMPANY_EDIT', 'ACCOUNT_LIST', 'ACCOUNT_EDIT', 'ORG_VIEW', 'ORG_EDIT'])).toEqual([
      'overview', 'employees', 'contracts', 'org', 'projects', 'leave', 'attendance', 'payroll', 'approvals', 'accounts', 'catalogs', 'company',
    ]);
  });

  it('merges the items of several roles', () => {
    expect(ids(['ACCOUNTANT', 'PROJECT_MANAGER'])).toEqual(['overview', 'projects', 'leave', 'attendance', 'payroll', 'approvals']);
  });

  it('shows org, accounts and company by permission, whatever the roles', () => {
    // An Admin whose permissions were taken away loses the three items; the role-list items stay.
    expect(ids(['ADMIN'])).toEqual(['overview', 'employees', 'contracts', 'projects', 'leave', 'attendance', 'payroll', 'approvals', 'catalogs']);
    expect(ids(['EMPLOYEE'], [...BASE, 'ORG_VIEW'])).toEqual(['overview', 'org', 'leave', 'attendance']);
    expect(ids(['EMPLOYEE'], [...BASE, 'ACCOUNT_LIST'])).toEqual(['overview', 'leave', 'attendance', 'accounts']);
    expect(ids(['EMPLOYEE'], [...BASE, 'COMPANY_EDIT'])).toEqual(['overview', 'leave', 'attendance', 'company']);
    // Editing without viewing does not open the page.
    expect(ids(['EMPLOYEE'], [...BASE, 'ORG_EDIT', 'ACCOUNT_EDIT'])).toEqual(['overview', 'leave', 'attendance']);
  });
});
