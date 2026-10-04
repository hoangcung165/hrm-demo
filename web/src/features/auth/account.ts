// The signed-in Account as the frontend knows it (GET /api/me, see the API contract on issue #44).
export const ROLES = ['ADMIN', 'HR', 'LINE_MANAGER', 'PROJECT_MANAGER', 'ACCOUNTANT', 'DIRECTOR', 'EMPLOYEE'] as const;
export type Role = (typeof ROLES)[number];

export type Account = {
  id: string;
  email: string;
  /** Display name; the email until Accounts are linked to Employees (HRM-06). */
  name: string;
  roles: Role[];
};
