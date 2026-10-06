// The role and permission matrix: the data scope of each role, then the permissions group by group, in the
// order the API returns them. Read-only.
import { useTranslation } from 'react-i18next';
import { Matrix, type MatrixGroup } from '@/components/ui/matrix';
import { ROLES } from '@/features/auth/account';
import type { RoleMatrix as RoleMatrixData } from '../api';

export type RoleMatrixProps = {
  /** Undefined while it loads: the role columns show over Skeleton rows. */
  matrix: RoleMatrixData | undefined;
};

/** Permission rows under their groups, keeping the API order; the permissions of one group come together. */
function permissionGroups(matrix: RoleMatrixData, label: (key: string, code: string) => string): MatrixGroup[] {
  const groups: MatrixGroup[] = [];
  for (const { permission, group } of matrix.permissions) {
    const last = groups.at(-1);
    const target = last?.id === group ? last : { id: group, label: label('permission.group', group), rows: [] };
    if (target !== last) groups.push(target);
    target.rows.push({ id: permission, label: label('permission', permission), values: matrix.roles.map((role) => role.permissions.includes(permission)) });
  }
  return groups;
}

export function RoleMatrix({ matrix }: RoleMatrixProps) {
  const { t } = useTranslation();
  // A permission or group a newer backend adds shows by its code until it has a name.
  const label = (key: string, code: string) => t(`${key}.${code}`, { defaultValue: code });
  const roles = matrix ? matrix.roles.map((rule) => rule.role) : ROLES;
  const groups: MatrixGroup[] = matrix
    ? [
        { id: 'scope', rows: [{ id: 'dataScope', label: t('roles.row.dataScope'), kind: 'text', values: matrix.roles.map((rule) => t(`accounts.scope.${rule.dataScope}`)) }] },
        ...permissionGroups(matrix, label),
      ]
    : [];
  return (
    <Matrix
      caption={t('roles.caption')}
      leadHeader={t('roles.col.permission')}
      columns={roles.map((role) => ({ id: role, label: label('role', role) }))}
      groups={groups}
      yesLabel={t('roles.granted')}
      noLabel={t('roles.notGranted')}
      scrollHint={t('roles.swipeHint')}
      loading={!matrix}
      loadingLabel={t('roles.loading')}
    />
  );
}
