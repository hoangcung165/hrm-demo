// For an Account with data scope ORG_UNIT (a Line manager): which units the list covers. The units are named when
// the Account may read the org tree (ORG_VIEW); otherwise the alert says it in general terms.
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { useCurrentAccount } from '@/features/auth/account-context';
import { useOrgStructure } from '@/features/org-unit/api';
import { formatNumber } from '@/lib/format';

export function EmployeeScopeAlert() {
  const { t } = useTranslation();
  const account = useCurrentAccount();
  const scoped = account.dataScope === 'ORG_UNIT';
  const structure = useOrgStructure(scoped && account.permissions.includes('ORG_VIEW'));
  if (!scoped) return null;
  // The scope lists the units the Account heads and every unit below them: the ones it heads are those whose
  // parent is not in the scope.
  const inScope = new Set(account.orgUnitIds);
  const headed = (structure.data?.units ?? []).filter((unit) => inScope.has(unit.id) && !(unit.parentId && inScope.has(unit.parentId)));
  const title =
    headed.length === 1
      ? t('employees.scope.one', { unit: headed[0]!.name })
      : headed.length > 1
        ? t('employees.scope.many', { formatted: formatNumber(headed.length) })
        : t('employees.scope.unknown');
  return (
    <Alert variant="info" title={title}>
      {t('employees.scope.text')}
    </Alert>
  );
}
