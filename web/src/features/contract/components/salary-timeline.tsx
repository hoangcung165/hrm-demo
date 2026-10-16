import { Eye, EyeOff, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DetailList } from '@/components/ui/detail-list';
import { formatDateRange, formatMoney } from '@/lib/format';
import { salaryAllowances, salaryPeriodStatus, salarySegmentKey } from '../salary-period';
import type { SalaryProfileSegment } from '../salary-profile-api';

const MASK = 'employees.profile.contracts.masked';

export function SalaryTimeline({ employeeId, segments, revealedKey, onToggle }: {
  employeeId: string;
  segments: SalaryProfileSegment[];
  revealedKey: string | null;
  onToggle: (key: string) => void;
}) {
  const { t } = useTranslation();
  const k = 'employees.profile.salaryProfile';
  return (
    <ol className="flex flex-col gap-5">
      {[...segments].sort((a, b) => b.from.localeCompare(a.from)).map(segment => {
        const key = salarySegmentKey(segment);
        const shown = revealedKey === key;
        const money = (value: number | null) =>
          value === null ? t('employees.none') : shown ? formatMoney(value) : t(MASK);
        const allowanceRows = salaryAllowances(segment.allowancesJson);
        const allowanceTotal = allowanceRows?.reduce((sum, row) => sum + row.amount, 0) ?? null;
        const state = salaryPeriodStatus(segment);
        const sourceContractId = segment.sourceContractId;
        const sourceName = segment.sourceAmendmentId ? t(`${k}.amendmentSource`) : t(`${k}.contractSource`);
        const source = sourceContractId ? (
          <Link className="text-link" to={`/employees/${employeeId}?tab=contracts#contract-${sourceContractId}`}>
            <FileText aria-hidden="true" className="mr-1 inline size-4" />
            {sourceName}
          </Link>
        ) : t(`${k}.unknownSource`);
        const toggleText = t(shown ? `${k}.hide` : `${k}.reveal`);
        return (
          <li key={key} className="relative ml-2 border-l-2 border-line pb-1 pl-5 last:pb-0">
            <span aria-hidden="true" className={state === 'current'
              ? 'absolute -left-[7px] top-5 size-3 rounded-full bg-brand-blue'
              : state === 'upcoming'
                ? 'absolute -left-[7px] top-5 size-3 rounded-full border-2 border-brand-blue bg-surface'
                : 'absolute -left-[7px] top-5 size-3 rounded-full bg-line'} />
            <Card title={formatDateRange(segment.from, segment.to)}
              titleAside={<Badge variant={state === 'current' ? 'success' : state === 'upcoming' ? 'info' : 'neutral'}>
                {t(`${k}.state.${state}`)}
              </Badge>}>
              <DetailList items={[
                { label: t(`${k}.salary`), value: <span className="tabular-nums">{money(segment.baseSalary)}</span> },
                { label: t(`${k}.insuranceSalary`), value: <span className="tabular-nums">{money(segment.insuranceSalary)}</span> },
                { label: t(`${k}.allowanceTotal`), value: allowanceTotal === null
                  ? t(`${k}.invalidAllowances`) : <span className="tabular-nums">{money(allowanceTotal)}</span> },
                { label: t(`${k}.insurance`), value: t(segment.insured ? 'employees.profile.contracts.yes' : 'employees.profile.contracts.no') },
                { label: t(`${k}.tax`), value: t(`employees.profile.contracts.taxMethod.${segment.taxMethod}`,
                  { defaultValue: segment.taxMethod }) },
                { label: t(`${k}.source`), value: source },
              ]} />
              {allowanceRows && allowanceRows.length > 0 ? (
                <div className="rounded-sm bg-surface-muted p-3">
                  <p className="mb-2 font-medium">{t(`${k}.allowances`)}</p>
                  <ul className="flex flex-col gap-2">
                    {allowanceRows.map((a, i) => (
                      <li key={`${a.name}-${i}`} className="flex flex-wrap justify-between gap-2 text-sm">
                        <span>{a.name}</span>
                        <span className="tabular-nums">{money(a.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {segment.overrideReason ? <p className="text-caption text-ink-muted">
                {t(`${k}.reason`)}: {segment.overrideReason}
              </p> : null}
              <div className="flex justify-end">
                <Button size="sm" variant="ghost" aria-pressed={shown}
                  aria-label={t(shown ? `${k}.hideNamed` : `${k}.revealNamed`,
                    { range: formatDateRange(segment.from, segment.to) })}
                  onClick={() => onToggle(key)}>
                  {shown ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  {toggleText}
                </Button>
              </div>
            </Card>
          </li>
        );
      })}
    </ol>
  );
}
