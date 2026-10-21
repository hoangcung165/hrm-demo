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
      'overview', 'employees', 'contracts', 'org', 'projects', 'leave', 'attendance', 'payroll', 'accounts', 'catalogs', 'contractTemplates', 'company',
    ]);
  });

  it('restricts Document templates navigation to HR and Admin roles', () => {
    expect(ids(['HR'])).toContain('contractTemplates');
    expect(ids(['ACCOUNTANT'])).not.toContain('contractTemplates');
    expect(ids(['EMPLOYEE'], [...BASE, 'EMPLOYEE_EDIT', 'EMPLOYEE_SENSITIVE_VIEW'])).not.toContain('contractTemplates');
  });

  it('merges the items of several roles', () => {
    expect(ids(['ACCOUNTANT', 'PROJECT_MANAGER'], [...BASE, 'PROJECT_VIEW'])).toEqual(['overview', 'projects', 'leave', 'attendance', 'payroll']);
  });

  it('shows employees, org, projects, accounts, catalogs and company by permission, whatever the roles', () => {
    // An Admin whose permissions were taken away loses the six items; the role-list items stay.
    expect(ids(['ADMIN'])).toEqual(['overview', 'contracts', 'leave', 'attendance', 'payroll', 'contractTemplates']);
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

  it('shows Nguồn lực by the RESOURCE_VIEW permission, whatever the roles', () => {
    expect(ids(['EMPLOYEE'], [...BASE, 'RESOURCE_VIEW'])).toEqual(['overview', 'resources', 'leave', 'attendance']);
    expect(ids(['PROJECT_MANAGER'], [...BASE, 'PROJECT_VIEW'])).not.toContain('resources');
  });

  it('shows Audit log by the AUDIT_VIEW permission only, last in Hệ thống', () => {
    expect(ids(['DIRECTOR'], [...BASE, 'AUDIT_VIEW'])).toEqual(['overview', 'leave', 'attendance', 'payroll', 'auditLog']);
    expect(ids(['ADMIN'], [...BASE, 'COMPANY_EDIT', 'AUDIT_VIEW']).slice(-2)).toEqual(['company', 'auditLog']);
    for (const role of ['HR', 'ACCOUNTANT', 'LINE_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE'] as Role[]) {
      expect(ids([role])).not.toContain('auditLog');
    }
  });

  it('shows Lịch phân ca and Ca làm việc by the SHIFT_VIEW permission, after Chấm công', () => {
    expect(ids(['HR'], [...BASE, 'SHIFT_VIEW'])).toContain('shifts');
    expect(ids(['EMPLOYEE'], [...BASE, 'SHIFT_VIEW'])).toEqual(['overview', 'leave', 'attendance', 'shiftCalendar', 'shifts']);
    expect(ids(['HR'])).not.toContain('shifts');
    // Assigning without viewing does not open the page.
    expect(ids(['LINE_MANAGER'], [...BASE, 'SHIFT_ASSIGN'])).not.toContain('shifts');
  });

  it('shows Cấu hình nghỉ phép by the LEAVE_POLICY_EDIT permission, after Danh mục', () => {
    expect(ids(['HR'], [...BASE, 'CATALOG_EDIT', 'LEAVE_POLICY_EDIT', 'COMPANY_EDIT']).slice(-4)).toEqual(['catalogs', 'contractTemplates', 'leavePolicies', 'company']);
    expect(ids(['EMPLOYEE'])).not.toContain('leavePolicies');
  });

  it('shows the approval inbox to every Account linked to an Employee, whatever the roles', () => {
    const linked = (roles: Role[]) => visibleNavGroups({ roles, permissions: BASE, employeeId: 'e1' }).flatMap((group) => group.items.map((item) => item.id));
    expect(linked(['EMPLOYEE'])).toEqual(['overview', 'leave', 'attendance', 'approvals']);
    expect(linked(['HR'])).toContain('approvals');
    // The first Admin has no Employee: the inbox would refuse it.
    expect(ids(['ADMIN'])).not.toContain('approvals');
  });
});
