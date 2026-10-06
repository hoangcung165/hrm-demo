// Unsaved changes of the role matrix: the permission list of each role the Admin touched, kept consistent with
// what a permission requires, and compared with the saved matrix cell by cell.
import { useState } from 'react';
import type { Permission, Role } from '@/features/auth/account';
import type { RoleMatrix } from './api';

export type RoleChange = { role: Role; permissions: Permission[]; count: number };

export function useRoleDraft(matrix: RoleMatrix) {
  // Only roles that were touched; a role ticked back to its saved list simply counts no change.
  const [draft, setDraft] = useState<Partial<Record<Role, Permission[]>>>({});
  const saved = (role: Role) => matrix.roles.find((rule) => rule.role === role)?.permissions ?? [];
  const held = (role: Role) => draft[role] ?? saved(role);

  const toggle = (role: Role, permission: Permission) => {
    const next = new Set(held(role));
    if (next.has(permission)) {
      // Unticking takes along every permission that requires this one, however deep.
      const drop = [permission];
      for (const gone of drop) {
        next.delete(gone);
        drop.push(...matrix.permissions.filter((info) => info.requires === gone && next.has(info.permission)).map((info) => info.permission));
      }
    } else {
      // Ticking brings what the permission requires.
      for (let add: Permission | null = permission; add && !next.has(add); add = matrix.permissions.find((info) => info.permission === add)?.requires ?? null) next.add(add);
    }
    // In the display order, as the API lists them.
    setDraft({ ...draft, [role]: matrix.permissions.map((info) => info.permission).filter((code) => next.has(code)) });
  };

  const isChanged = (role: Role, permission: Permission) => held(role).includes(permission) !== saved(role).includes(permission);
  /** The roles whose list differs from the saved one, in the order of the matrix, with their full new list. */
  const changes: RoleChange[] = matrix.roles
    .map((rule) => ({ role: rule.role, permissions: held(rule.role), count: matrix.permissions.filter((info) => isChanged(rule.role, info.permission)).length }))
    .filter((change) => change.count > 0);
  return { held, isChanged, toggle, changes, total: changes.reduce((sum, change) => sum + change.count, 0), discard: () => setDraft({}) };
}
