// HRM-10/FE-3. Salary profiles are immutable: changes come from signed contracts or amendments.
import { useState, type FormEvent } from 'react';
import { Banknote } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { StateBlock } from '@/components/ui/state-block';
import { ApiError } from '@/lib/api';
import { initialSalaryPeriod, periodPieces, validPeriod, type DatePeriod } from '../salary-period';
import { useSalaryPeriod } from '../salary-profile-api';
import { SalarySegmentBar } from './salary-segment-bar';
import { SalaryTimeline } from './salary-timeline';

export function ProfileSalarySection({ employeeId, canReadSalary }: {
  employeeId: string;
  canReadSalary: boolean;
}) {
  const { t } = useTranslation();
  const k = 'employees.profile.salaryProfile';
  const [draft, setDraft] = useState<DatePeriod>(initialSalaryPeriod);
  const [period, setPeriod] = useState<DatePeriod>(initialSalaryPeriod);
  const [invalid, setInvalid] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const query = useSalaryPeriod(employeeId, period.from, period.to, canReadSalary);
  const pieces = periodPieces(period, query.data ?? []);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validPeriod(draft)) { setInvalid(true); return; }
    setInvalid(false);
    setRevealedKey(null);
    setPeriod({ ...draft });
  };
  if (!canReadSalary || (query.error instanceof ApiError && query.error.status === 403)) {
    return <Card bare><StateBlock variant="denied" title={t(`${k}.deniedTitle`)}
      description={t(`${k}.deniedText`)} /></Card>;
  }
  return (
    <section className="flex flex-col gap-5" aria-label={t('employees.profile.tab.salary')}>
      <div>
        <h2 className="text-heading">{t(`${k}.title`)}</h2>
        <p className="mt-2 text-caption text-ink-muted">{t(`${k}.readOnlyHint`)}</p>
      </div>
      <Card title={t(`${k}.periodTitle`)} description={t(`${k}.periodDescription`)}>
        <form className="flex flex-wrap items-end gap-3" noValidate onSubmit={submit}>
          <Field label={t(`${k}.from`)} className="min-w-[170px] flex-1">
            {props => <Input {...props} type="date" value={draft.from} required
              onChange={event => { setDraft(d => ({ ...d, from: event.target.value })); setInvalid(false); }} />}
          </Field>
          <Field label={t(`${k}.to`)} className="min-w-[170px] flex-1">
            {props => <Input {...props} type="date" value={draft.to} required
              onChange={event => { setDraft(d => ({ ...d, to: event.target.value })); setInvalid(false); }} />}
          </Field>
          <Button type="submit">{t(`${k}.apply`)}</Button>
        </form>
        {invalid ? <p role="alert" className="text-caption text-danger">{t(`${k}.invalidPeriod`)}</p> : null}
      </Card>
      {query.isPending ? (
        <Card bare><div className="p-4 md:p-6"><Loading label={t(`${k}.loading`)} /></div></Card>
      ) : query.isError ? (
        <Card bare><ErrorState title={t(`${k}.loadError`)} onRetry={() => void query.refetch()} /></Card>
      ) : !query.data?.length ? (
        <Card bare><EmptyState icon={<Banknote aria-hidden="true" />}
          title={t(`${k}.emptyTitle`)} description={t(`${k}.emptyText`)} /></Card>
      ) : (
        <>
          <Card title={t(`${k}.segmentsTitle`)} description={t(`${k}.segmentsDescription`)}>
            <SalarySegmentBar pieces={pieces} revealedKey={revealedKey} />
          </Card>
          <div className="flex flex-col gap-3">
            <h2 className="text-heading">{t(`${k}.timelineTitle`)}</h2>
            <SalaryTimeline employeeId={employeeId} segments={query.data}
              revealedKey={revealedKey}
              onToggle={key => setRevealedKey(current => current === key ? null : key)} />
          </div>
        </>
      )}
    </section>
  );
}
