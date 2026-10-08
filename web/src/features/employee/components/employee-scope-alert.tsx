// For an Account with data scope ORG_UNIT (a Line manager): which units the list covers, named from the unit options
// (up to three; more are counted). Until the units are in, the alert says it in general terms.
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { useCurrentAccount } from '@/features/auth/account-context';
import { useOrgUnitOptions } from '@/features/org-unit/api';
import { formatNumber } from '@/lib/format';

export function EmployeeScopeAlert() {
  const { t } = useTranslation();
  const account = useCurrentAccount();
  const scoped = account.dataScope === 'ORG_UNIT';
  const units = useOrgUnitOptions();
  if (!scoped) return null;
  // The scope lists the units the Account heads and every unit below them: the ones it heads are those whose
  // parent is not in the scope.
  const inScope = new Set(account.orgUnitIds);
  const headed = (units.data ?? []).filter((unit) => inScope.has(unit.id) && !(unit.parentId && inScope.has(unit.parentId)));
  const title =
    headed.length === 0
      ? t('employees.scope.unknown')
      : headed.length <= 3
        ? t('employees.scope.one', { unit: headed.map((unit) => unit.name).join(', ') })
        : t('employees.scope.many', { formatted: formatNumber(headed.length) });
  return (
    <Alert variant="info" title={title}>
      {t('employees.scope.text')}
    </Alert>
  );
}
