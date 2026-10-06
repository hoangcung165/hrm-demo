// Role matrix API (Phạm vi truy cập). Contract: "## API contract: editable role permissions (BE-6)" on issue #6.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DataScope, Permission, Role } from '@/features/auth/account';
import { api } from '@/lib/api';

/** Mirrors the backend enum `PermissionGroup`. */
export type PermissionGroup = 'COMPANY' | 'ACCOUNT' | 'ORG';

/** Mirrors the backend record `RoleMatrixResponse.PermissionInfo`. */
export type PermissionInfo = {
  permission: Permission;
  group: PermissionGroup;
  /** `BASE`: every Account has it whatever its roles. */
  locked: 'BASE' | null;
  /** The permission a role must also have to hold this one. */
  requires: Permission | null;
};

/** Mirrors the backend record `RoleMatrixResponse.RoleRule`. */
export type RoleRule = {
  role: Role;
  /** How far an Account holding only this role sees; fixed per role. */
  dataScope: DataScope;
  /** `ADMIN_ALL`: the Admin role always has every permission. */
  locked: 'ADMIN_ALL' | null;
  permissions: Permission[];
};

/** Mirrors the backend record `RoleMatrixResponse`: permissions in display order, roles in a fixed order. */
export type RoleMatrix = { customized: boolean; permissions: PermissionInfo[]; roles: RoleRule[] };

export const ROLE_MATRIX_KEY = ['roles', 'matrix'] as const;

/** What each role sees and may do in this company. Needs `ACCOUNT_LIST`. */
export function useRoleMatrix() {
  return useQuery({ queryKey: ROLE_MATRIX_KEY, queryFn: () => api<RoleMatrix>('/api/roles') });
}

/** Mirrors the backend record `RolePermissionsRequest`: the complete list of each listed role; a role left out keeps its own. */
export type RolePermissionsRequest = { roles: Array<{ role: Role; permissions: Permission[] }> };

/** Saves the listed roles together or not at all; the matrix on screen becomes the one the server returns. */
export function useSaveRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RolePermissionsRequest) => api<RoleMatrix>('/api/roles/permissions', { method: 'PUT', body }),
    onSuccess: (matrix) => queryClient.setQueryData(ROLE_MATRIX_KEY, matrix),
  });
}
