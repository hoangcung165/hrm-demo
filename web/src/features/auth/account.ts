// The signed-in Account as the frontend knows it (GET /api/me, see the API contracts on issues #44, #4 and #6).
export const ROLES = ['ADMIN', 'HR', 'LINE_MANAGER', 'PROJECT_MANAGER', 'ACCOUNTANT', 'DIRECTOR', 'EMPLOYEE'] as const;
export type Role = (typeof ROLES)[number];

/** Access scope (HRM-02): whose records the Account sees, and the features it may use. */
export type DataScope = 'SELF' | 'ORG_UNIT' | 'COMPANY';
export type Permission = 'COMPANY_VIEW' | 'COMPANY_EDIT' | 'ACCOUNT_VIEW' | 'ACCOUNT_LIST' | 'ACCOUNT_EDIT' | 'ORG_VIEW' | 'ORG_EDIT' | 'EMPLOYEE_VIEW' | 'EMPLOYEE_EDIT' | 'EMPLOYEE_SENSITIVE_VIEW' | 'CATALOG_EDIT' | 'APPROVAL_FLOW_EDIT' | 'PROJECT_VIEW' | 'PROJECT_EDIT' | 'PROJECT_EDIT_ALL' | 'RESOURCE_VIEW' | 'RESOURCE_EDIT' | 'LEAVE_POLICY_EDIT' | 'AUDIT_VIEW';

/** Mirrors the backend record `MeResponse`. */
export type Account = {
  id: string;
  email: string;
  /** The Account's own name; from HRM-06 the name of the linked Employee. */
  fullName: string;
  roles: Role[];
  dataScope: DataScope;
  permissions: Permission[];
  /** With data scope `ORG_UNIT`: the units the Account's Employee heads and every unit below them; empty otherwise. */
  orgUnitIds: string[];
  /** `null` until Accounts are linked to Employees (HRM-06). */
  employeeId: string | null;
  demo: DemoState;
};

/** "Demo as…": whether the switch is there, and which persona this Account is (`null` for a normal Account). */
export type DemoState = { enabled: boolean; persona: Role | null };
