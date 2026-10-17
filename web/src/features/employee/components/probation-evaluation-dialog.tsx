import { useEffect, useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { FormGrid } from '@/components/ui/form-grid';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmployeeManagerPicker } from '@/features/employee/components/employee-manager-picker';
import type { EmployeeRef } from '@/features/employee/api';
import type { EmploymentContract } from '@/features/contract/api';
import { ApiError } from '@/lib/api';
import { companyTodayIso } from '@/lib/company-time';
import type { ProbationWrite } from '../work-history-write';

const initial = { sourceContractId: '', evaluatorId: '', startsOn: '', endsOn: '', outcome: 'PASS' as ProbationWrite['outcome'], notes: '' };

export function ProbationEvaluationDialog({ contracts, manager, onClose, onSave, onDirty }: {
  contracts: EmploymentContract[]; manager: EmployeeRef | null; onClose: () => void;
  onSave: (body: ProbationWrite) => Promise<void>; onDirty: (dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const k = 'employees.profile.history.actions';
  const formId = useId();
  const [form, setForm] = useState<ProbationWrite>({ ...initial, evaluatorId: manager?.id ?? '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dirty = JSON.stringify(form) !== JSON.stringify({ ...initial, evaluatorId: manager?.id ?? '' });
  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  const eligible = contracts.filter(c => c.contractType === 'PROBATION' && c.endsOn
    || c.probationStartsOn && c.probationEndsOn);
  const source = eligible.find(c => c.id === form.sourceContractId);
  const set = <K extends keyof ProbationWrite>(name: K, value: ProbationWrite[K]) => {
    setForm(previous => ({ ...previous, [name]: value })); setError('');
  };
  const close = () => { if (!saving) { onDirty(false); onClose(); } };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const start = source?.contractType === 'PROBATION' ? source.startsOn : source?.probationStartsOn;
    const end = source?.contractType === 'PROBATION' ? source.endsOn : source?.probationEndsOn;
    if (!source || !form.evaluatorId || !form.startsOn || !form.endsOn || !form.notes.trim()
      || form.notes.length > 1000 || !start || !end || form.startsOn < start || form.endsOn > end
      || form.endsOn < form.startsOn || form.endsOn > companyTodayIso()) {
      setError(t(`${k}.invalidEvaluation`)); return;
    }
    setSaving(true); setError('');
    try { await onSave({ ...form, notes: form.notes.trim() }); onDirty(false); onClose(); }
    catch (e) { setError(t(`${k}.${e instanceof ApiError && e.status === 403 ? 'denied' : e instanceof ApiError && e.code === 'probation.already_evaluated' ? 'alreadyEvaluated' : 'saveFailed'}`)); }
    finally { setSaving(false); }
  };
  return <Dialog open title={t(`${k}.evaluationTitle`)} description={t(`${k}.evaluationHelp`)} busy={saving} size="wide"
    onOpenChange={open => { if (!open && !dirty) close(); }} footer={<>
      <Button variant="secondary" disabled={saving} onClick={close}>{t('dialog.cancel')}</Button>
      <Button type="submit" form={formId} disabled={saving}>{t(`${k}.saveEvaluation`)}</Button>
    </>}>
    <form id={formId} noValidate onSubmit={event => void submit(event)} className="flex flex-col gap-4">
      <FormGrid>
        <Field label={t(`${k}.sourceContract`)} required>{props => <Select id={props.id} value={form.sourceContractId}
          onChange={value => { const next = eligible.find(c => c.id === value)!;
            setForm(previous => ({ ...previous, sourceContractId: value,
              startsOn: next.contractType === 'PROBATION' ? next.startsOn : next.probationStartsOn ?? '',
              endsOn: next.contractType === 'PROBATION' ? next.endsOn ?? '' : next.probationEndsOn ?? '' })); setError(''); }}
          placeholder={t(`${k}.chooseContract`)} disabled={saving}
          options={eligible.map(c => ({ value: c.id, label: c.contractNumber }))} />}</Field>
        <Field label={t(`${k}.evaluator`)} required>{props => <EmployeeManagerPicker id={props.id}
          initial={manager} value={form.evaluatorId} onChange={value => set('evaluatorId', value)} />}</Field>
        {(['startsOn', 'endsOn'] as const).map(name => <Field key={name} label={t(`${k}.${name}`)} required>{props =>
          <Input id={props.id} type="date" value={form[name]} disabled={saving} max={companyTodayIso()}
            onChange={event => set(name, event.target.value)} />}</Field>)}
        <Field label={t(`${k}.outcome`)} required>{props => <Select id={props.id} value={form.outcome}
          onChange={value => set('outcome', value as ProbationWrite['outcome'])} disabled={saving}
          placeholder={t(`${k}.outcome`)} options={(['PASS', 'FAIL', 'EXTEND'] as const)
            .map(outcome => ({ value: outcome, label: t(`${k}.outcomeKind.${outcome}`) }))} />}</Field>
        <Field label={t(`${k}.notes`)} required>{props => <Input id={props.id} value={form.notes}
          maxLength={1000} disabled={saving} onChange={event => set('notes', event.target.value)} />}</Field>
      </FormGrid>
      {!eligible.length ? <p role="status" className="text-caption text-ink-muted">{t(`${k}.noProbationContract`)}</p> : null}
      {error ? <p role="alert" className="text-caption text-danger">{error}</p> : null}
    </form>
  </Dialog>;
}
