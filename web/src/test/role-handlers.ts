// MSW handlers for the role matrix ("## API contract: editable role permissions (BE-6)" on issue #6).
import { delay, http, HttpResponse } from 'msw';
import type { Permission, Role } from '@/features/auth/account';
import type { RoleMatrix } from '@/features/role/api';
import { problem } from './auth-handlers';

const BASE: Permission[] = ['COMPANY_VIEW', 'ACCOUNT_VIEW'];
const rule = (role: Role, dataScope: RoleMatrix['roles'][number]['dataScope'], extra: Permission[] = []): RoleMatrix['roles'][number] => ({
  role,
  dataScope,
  locked: role === 'ADMIN' ? 'ADMIN_ALL' : null,
  // In the display order of the permissions, as the backend's enum set gives them.
  permissions: ROLE_MATRIX_PERMISSIONS.map((info) => info.permission).filter((permission) => role === 'ADMIN' || BASE.includes(permission) || extra.includes(permission)),
});

const ROLE_MATRIX_PERMISSIONS: RoleMatrix['permissions'] = [
  { permission: 'COMPANY_VIEW', group: 'COMPANY', locked: 'BASE', requires: null },
  { permission: 'COMPANY_EDIT', group: 'COMPANY', locked: null, requires: 'COMPANY_VIEW' },
  { permission: 'ACCOUNT_VIEW', group: 'ACCOUNT', locked: 'BASE', requires: null },
  { permission: 'ACCOUNT_LIST', group: 'ACCOUNT', locked: null, requires: null },
  { permission: 'ACCOUNT_EDIT', group: 'ACCOUNT', locked: null, requires: 'ACCOUNT_LIST' },
  { permission: 'ORG_VIEW', group: 'ORG', locked: null, requires: null },
  { permission: 'ORG_EDIT', group: 'ORG', locked: null, requires: 'ORG_VIEW' },
];

/** The default permissions of every role (`AccessScopeService`), in the backend's role order. */
export const ROLE_MATRIX: RoleMatrix = {
  customized: false,
  permissions: ROLE_MATRIX_PERMISSIONS,
  roles: [
    rule('ADMIN', 'COMPANY'),
    rule('HR', 'COMPANY', ['ORG_VIEW', 'ORG_EDIT']),
    rule('LINE_MANAGER', 'ORG_UNIT'),
    rule('PROJECT_MANAGER', 'SELF'),
    rule('ACCOUNTANT', 'COMPANY'),
    rule('DIRECTOR', 'COMPANY', ['ORG_VIEW']),
    rule('EMPLOYEE', 'SELF'),
  ],
};

/** GET /api/roles with this matrix. */
export const roleMatrixOk = (matrix: RoleMatrix = ROLE_MATRIX, { delayMs = 0 }: { delayMs?: number } = {}) =>
  http.get('*/api/roles', async () => {
    await delay(delayMs);
    return HttpResponse.json(matrix);
  });
export const roleMatrixDenied = () => http.get('*/api/roles', () => problem(403, 'auth.forbidden'));
export const roleMatrixFails = () => http.get('*/api/roles', () => problem(500, 'error.unknown'));
