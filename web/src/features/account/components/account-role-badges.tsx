// The roles of an Account as Badges in the order of the Role enum. More than three: the first two and "+n", which names the rest.
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { ROLES, type Role } from '@/features/auth/account';

export type AccountRoleBadgesProps = { roles: Role[] };

const MAX_SHOWN = 3;

export function AccountRoleBadges({ roles }: AccountRoleBadgesProps) {
  const { t } = useTranslation();
  const ordered = ROLES.filter((role) => roles.includes(role));
  const shown = ordered.length > MAX_SHOWN ? ordered.slice(0, MAX_SHOWN - 1) : ordered;
  const rest = ordered.slice(shown.length).map((role) => t(`role.${role}`));
  return (
    <>
      {shown.map((role) => (
        <Badge key={role} variant="info" className="whitespace-nowrap">
          {t(`role.${role}`)}
        </Badge>
      ))}
      {rest.length > 0 ? (
        <Badge variant="neutral" title={rest.join(', ')}>
          <span aria-hidden="true">{t('accounts.moreRoles', { count: rest.length })}</span>
          <span className="sr-only">{t('accounts.moreRolesLabel', { count: rest.length, roles: rest.join(', ') })}</span>
        </Badge>
      ) : null}
    </>
  );
}
