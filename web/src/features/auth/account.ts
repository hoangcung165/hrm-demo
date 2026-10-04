// The signed-in Account as the frontend knows it (GET /api/me, see the API contracts on issues #44 and #4).
export const ROLES = ['ADMIN', 'HR', 'LINE_MANAGER', 'PROJECT_MANAGER', 'ACCOUNTANT', 'DIRECTOR', 'EMPLOYEE'] as const;
export type Role = (typeof ROLES)[number];

/** Access scope (HRM-02): whose records the Account sees, and the features it may use. */
export type DataScope = 'SELF' | 'COMPANY';
export type Permission = 'COMPANY_VIEW' | 'COMPANY_EDIT' | 'ACCOUNT_VIEW' | 'ORG_VIEW' | 'ORG_EDIT';

export type Account = {
  id: string;
  email: string;
  /** Display name; the email until Accounts are linked to Employees (HRM-06). */
  name: string;
  roles: Role[];
  dataScope: DataScope;
  permissions: Permission[];
};
