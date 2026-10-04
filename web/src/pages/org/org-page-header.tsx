// Title of the Org structure page with the company's totals once they are loaded, and the page-level add action.
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useOrgStructure } from '@/features/org-unit/api';
import { useOrgUnitActions } from '@/features/org-unit/org-unit-actions-context';
import { formatNumber } from '@/lib/format';

export type OrgPageHeaderProps = { canView: boolean };

export function OrgPageHeader({ canView }: OrgPageHeaderProps) {
  const { t } = useTranslation();
  const summary = useOrgStructure(canView).data?.summary;
  const actions = useOrgUnitActions();
  const count = (key: 'org.unitCount' | 'org.employeeCount', value: number) => t(key, { count: value, formatted: formatNumber(value) });
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h1 className="text-title">{t('org.title')}</h1>
        {summary ? (
          <span className="text-ink-muted">
            {t('org.summary', {
              units: count('org.unitCount', summary.activeUnitCount),
              employees: count('org.employeeCount', summary.employeeCount),
            })}
          </span>
        ) : null}
      </div>
      {actions ? (
        <Button ref={actions.addButtonRef} onClick={() => actions.openAdd()}>
          <Plus aria-hidden="true" />
          {t('org.add')}
        </Button>
      ) : null}
    </div>
  );
}
