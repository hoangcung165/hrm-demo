import { visibleNavGroups } from './nav-items';

const ids = (roles: Parameters<typeof visibleNavGroups>[0]) =>
  visibleNavGroups(roles).flatMap((group) => group.items.map((item) => item.id));

describe('visibleNavGroups', () => {
  it('shows an Employee only the self-service items and drops empty groups', () => {
    expect(ids(['EMPLOYEE'])).toEqual(['overview', 'leave', 'attendance']);
    expect(visibleNavGroups(['EMPLOYEE']).map((group) => group.id)).toEqual(['main', 'time']);
  });

  it('shows an Admin every item', () => {
    expect(ids(['ADMIN'])).toEqual([
      'overview', 'employees', 'contracts', 'org', 'projects', 'leave', 'attendance', 'payroll', 'approvals', 'accounts', 'catalogs', 'company',
    ]);
  });

  it('merges the items of several roles', () => {
    expect(ids(['ACCOUNTANT', 'PROJECT_MANAGER'])).toEqual(['overview', 'projects', 'leave', 'attendance', 'payroll', 'approvals']);
  });
});
