// The role and permission matrix: the data scope of each role, then the permissions group by group, in the
// order the API returns them. Read-only, or with `edit` a Checkbox per cell the Admin may change.
import type { Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { Matrix, type MatrixGroup } from '@/components/ui/matrix';
import type { MatrixCellEdit } from '@/components/ui/matrix-cell';
import { ROLES, type Permission, type Role } from '@/features/auth/account';
import type { PermissionInfo, RoleMatrix as RoleMatrixData, RoleRule } from '../api';
import type { useRoleDraft } from '../use-role-draft';

export type RoleMatrixProps = {
  /** Undefined while it loads: the role columns show over Skeleton rows. */
  matrix: RoleMatrixData | undefined;
  /** The unsaved changes; with it the cells are boxes and locked checks. */
  draft?: ReturnType<typeof useRoleDraft>;
  saving?: boolean;
  regionRef?: Ref<HTMLDivElement>;
};

export function RoleMatrix({ matrix, draft, saving, regionRef }: RoleMatrixProps) {
  const { t } = useTranslation();
  // A permission or group a newer backend adds shows by its code until it has a name.
  const label = (key: string, code: string) => t(`${key}.${code}`, { defaultValue: code });
  const has = (rule: RoleRule, permission: Permission) => (draft ? draft.held(rule.role) : rule.permissions).includes(permission);
  /** A granted cell that cannot change is named with its reason; a locked cell that is not granted stays a dash. */
  const cell = (rule: RoleRule, info: PermissionInfo): MatrixCellEdit | undefined => {
    const names = { role: label('role', rule.role), permission: label('permission', info.permission) };
    const locked = rule.locked === 'ADMIN_ALL' ? 'lockedAdmin' : info.locked === 'BASE' ? 'lockedBase' : null;
    if (!locked) return { name: t('roles.cell.name', names), changed: draft?.isChanged(rule.role, info.permission) };
    return has(rule, info.permission) ? { name: t(`roles.cell.${locked}`, names), locked: true } : undefined;
  };

  const groups: MatrixGroup[] = [];
  if (matrix) {
    groups.push({
      id: 'scope',
      rows: [{ id: 'dataScope', label: t('roles.row.dataScope'), note: draft && t('roles.note.scope'), kind: 'text', values: matrix.roles.map((rule) => t(`accounts.scope.${rule.dataScope}`)) }],
    });
    // Permission rows under their groups, keeping the API order; the permissions of one group come together.
    for (const info of matrix.permissions) {
      if (groups.at(-1)?.id !== info.group) groups.push({ id: info.group, label: label('permission.group', info.group), rows: [] });
      groups.at(-1)!.rows.push({
        id: info.permission,
        label: label('permission', info.permission),
        note: draft && info.locked === 'BASE' ? t('roles.note.base') : undefined,
        values: matrix.roles.map((rule) => has(rule, info.permission)),
        edit: draft ? (matrix.roles.map((rule) => cell(rule, info)) as MatrixCellEdit[]) : undefined,
      });
    }
  }
  const changesOf = (role: Role) => draft?.changes.find((change) => change.role === role)?.count;
  const columns = matrix
    ? matrix.roles.map((rule) => ({
        id: rule.role,
        label: label('role', rule.role),
        note: draft && rule.locked === 'ADMIN_ALL' ? t('roles.note.admin') : undefined,
        changes: changesOf(rule.role) ? t('roles.changes', { count: changesOf(rule.role) }) : undefined,
      }))
    : ROLES.map((role) => ({ id: role, label: label('role', role) }));
  return (
    <Matrix
      caption={t('roles.caption')}
      leadHeader={t('roles.col.permission')}
      columns={columns}
      groups={groups}
      yesLabel={t('roles.granted')}
      noLabel={t('roles.notGranted')}
      scrollHint={t('roles.swipeHint')}
      loading={!matrix}
      loadingLabel={t('roles.loading')}
      changedLabel={draft ? t('roles.legend.changed') : undefined}
      saving={saving}
      regionRef={regionRef}
      onToggle={(permission, role) => draft?.toggle(role as Role, permission as Permission)}
    />
  );
}
