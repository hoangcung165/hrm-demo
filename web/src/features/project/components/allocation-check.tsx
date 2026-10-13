// The result of the live "try allocation" under the fields of the allocate dialog: a skeleton while it runs, then the
// load per period and either the danger alert (overload: who, how much, when, with which projects, how to fix) or
// the success alert with the peak. Saving stays possible either way.
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { AllocationLoadRow } from '@/components/ui/allocation-load-row';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateRange, formatPercent } from '@/lib/format';
import type { LoadPeriod } from '../api';
import type { TryAllocationResult } from '../allocation-api';
import { overloadText } from '../allocation-overload-text';
import type { AllocationCheckState } from '../use-allocation-check';

function PeriodRow({ period }: { period: LoadPeriod }) {
  const { t } = useTranslation();
  const parts = period.parts.map((part) => `${part.projectCode ?? part.projectName ?? ''} ${formatPercent(part.percent)}`).join(' + ');
  return (
    <AllocationLoadRow
      period={formatDateRange(period.from, period.to)}
      percent={period.totalPercent}
      label={t(period.overloaded ? 'projects.load.labelOver' : 'projects.load.label', { percent: formatPercent(period.totalPercent) })}
      breakdown={parts || t('projects.allocate.noLoad')}
      overloadLead={period.overloaded ? t('projects.allocate.overLead') : undefined}
    />
  );
}

function Verdict({ result }: { result: TryAllocationResult }) {
  const { t } = useTranslation();
  const name = result.employee?.fullName ?? '';
  const over = overloadText(result, name, t);
  if (over) {
    return (
      <Alert variant="danger" title={over.title}>
        {[over.others ? t('projects.allocate.overlaps', { others: over.others }) : '', over.fix].filter(Boolean).join(' ')}
      </Alert>
    );
  }
  return <Alert variant="success" title={t('projects.allocate.okTitle', { name, percent: formatPercent(result.peak) })} />;
}

export function AllocationCheck({ state }: { state: AllocationCheckState }) {
  const { t } = useTranslation();
  if (state.status === 'idle') return <p className="text-caption text-ink-muted">{t('projects.allocate.idle')}</p>;
  if (state.status === 'checking') {
    return (
      <div role="status" aria-busy="true" aria-label={t('projects.allocate.checking')} className="flex flex-col gap-3">
        <Skeleton className="w-2/5" />
        <Skeleton shape="control" />
        <Skeleton className="w-3/5" />
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <Alert variant="warning" title={t('projects.allocate.checkFailed')}>
        {t('projects.allocate.checkFailedText')}
      </Alert>
    );
  }
  const { result } = state;
  return (
    <div className="flex flex-col gap-3">
      <Verdict result={result} />
      {result.periods.length > 0 ? (
        <section aria-label={t('projects.allocate.periods', { name: result.employee?.fullName ?? '' })}>
          <h3 className="text-body-strong">{t('projects.allocate.periodsTitle')}</h3>
          <ul className="max-h-52 divide-y divide-line overflow-y-auto">
            {result.periods.map((period) => (
              <PeriodRow key={period.from} period={period} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
