// Title of the Org structure page with the company's totals once they are loaded.
import { useTranslation } from 'react-i18next';
import { useOrgStructure } from '@/features/org-unit/api';
import { formatNumber } from '@/lib/format';

export type OrgPageHeaderProps = { canView: boolean };

export function OrgPageHeader({ canView }: OrgPageHeaderProps) {
  const { t } = useTranslation();
  const summary = useOrgStructure(canView).data?.summary;
  const count = (key: 'org.unitCount' | 'org.employeeCount', value: number) => t(key, { count: value, formatted: formatNumber(value) });
  return (
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
  );
}
