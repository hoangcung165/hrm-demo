import { useEffect, useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { FormGrid } from '@/components/ui/form-grid';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { AllowancesEditor, readAllowanceRows } from '@/features/contract/components/allowances-editor';
import { useOrgUnitOptions } from '@/features/org-unit/api';
import { ApiError } from '@/lib/api';
import { companyTodayIso } from '@/lib/company-time';
import { formatMoney } from '@/lib/format';
import { usePositions } from '../api';
import type { DecisionKind, WorkDecisionWrite } from '../work-history-write';

type Form = { kind: DecisionKind; decisionNumber: string; signedOn: string; effectiveOn: string;
  description: string; orgUnitId: string; positionId: string; pay: boolean;
  baseSalary: string; insuranceSalary: string; allowancesJson: string };
const initial: Form = { kind: 'REWARD', decisionNumber: '', signedOn: '', effectiveOn: '', description: '',
  orgUnitId: '', positionId: '', pay: false, baseSalary: '', insuranceSalary: '', allowancesJson: '' };
const amount = (value: string) => value === '' || /^\d+$/.test(value);

export function WorkDecisionDialog({ employee, canEditPay, onClose, onSave, onDirty }: {
  employee: { job: { hireDate: string; orgUnit: { id: string } | null; position: { id: string } } };
  canEditPay: boolean;
  onClose: () => void; onSave: (body: WorkDecisionWrite) => Promise<void>; onDirty: (dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const k = 'employees.profile.history.actions';
  const formId = useId();
  const [form, setForm] = useState<Form>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const units = useOrgUnitOptions();
  const positions = usePositions();
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  const set = <K extends keyof Form>(name: K, value: Form[K]) => {
    setForm(previous => ({ ...previous, [name]: value })); setError('');
  };
  const close = () => { if (!saving) { onDirty(false); onClose(); } };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.decisionNumber.trim() || form.decisionNumber.length > 80 || !form.description.trim()
      || form.description.length > 1000 || !form.signedOn || !form.effectiveOn
      || form.signedOn > form.effectiveOn || form.effectiveOn < employee.job.hireDate
      || form.effectiveOn > companyTodayIso() || form.kind === 'TRANSFER' && (!form.orgUnitId
        || form.orgUnitId === (employee.job.orgUnit?.id ?? '__company__'))
      || form.kind === 'PROMOTION' && (!form.positionId || form.positionId === employee.job.position.id)
      || form.pay && (!amount(form.baseSalary) || !amount(form.insuranceSalary)
        || form.kind === 'DISCIPLINE' || form.allowancesJson && readAllowanceRows(form.allowancesJson) === null
        || !form.baseSalary && !form.insuranceSalary && !form.allowancesJson)) {
      setError(t(`${k}.invalidDecision`)); return;
    }
    const body: WorkDecisionWrite = {
      decisionNumber: form.decisionNumber.trim(), kind: form.kind, signedOn: form.signedOn,
      effectiveOn: form.effectiveOn, description: form.description.trim(),
      orgUnitId: form.kind === 'TRANSFER' ? form.orgUnitId === '__company__' ? null : form.orgUnitId : null,
      positionId: form.kind === 'PROMOTION' ? form.positionId : null,
      baseSalary: form.pay && form.baseSalary !== '' ? Number(form.baseSalary) : null,
      insuranceSalary: form.pay && form.insuranceSalary !== '' ? Number(form.insuranceSalary) : null,
      allowancesJson: form.pay ? form.allowancesJson || null : null,
    };
    setSaving(true); setError('');
    try { await onSave(body); onDirty(false); onClose(); }
    catch (e) { setError(t(`${k}.${e instanceof ApiError && e.status === 403 ? 'denied' : e instanceof ApiError && e.code === 'work_history.number_taken' ? 'numberTaken' : e instanceof ApiError && e.code === 'work_history.backdated' ? 'backdated' : 'saveFailed'}`)); }
    finally { setSaving(false); }
  };
  const field = (name: 'decisionNumber' | 'signedOn' | 'effectiveOn' | 'description', type = 'text') =>
    <Field label={t(`${k}.${name}`)} required>{props => <Input id={props.id} type={type} required
      aria-required={props['aria-required']} aria-describedby={props['aria-describedby']}
      max={type === 'date' ? companyTodayIso() : undefined} min={name === 'effectiveOn' ? employee.job.hireDate : undefined}
      value={form[name]} disabled={saving} onChange={event => set(name, event.target.value)} />}</Field>;
  const unitOptions = [{ value: '__company__', label: t('employees.underCompany') },
    ...(units.data ?? []).filter(unit => unit.active).map(unit => ({ value: unit.id, label: unit.name }))];
  const positionOptions = (positions.data ?? []).filter(position => position.active).map(position => ({ value: position.id, label: position.name }));
  return <Dialog open title={t(`${k}.decisionTitle`)} description={t(`${k}.decisionHelp`)} size="wide" busy={saving}
    onOpenChange={open => { if (!open && !dirty) close(); }}
    footer={<><Button variant="secondary" disabled={saving} onClick={close}>{t('dialog.cancel')}</Button>
      <Button type="submit" form={formId} disabled={saving}>{t(`${k}.saveDecision`)}</Button></>}>
    <form id={formId} onSubmit={event => void submit(event)} noValidate className="flex flex-col gap-4">
      <FormGrid>
        <Field label={t(`${k}.kind`)} required>{props => <Select id={props.id} value={form.kind}
          onChange={value => { setForm(previous => ({ ...previous, kind: value as DecisionKind, pay: value === 'DISCIPLINE' ? false : previous.pay })); setError(''); }}
          disabled={saving} placeholder={t(`${k}.kind`)} options={(['TRANSFER', 'PROMOTION', 'REWARD', 'DISCIPLINE'] as const)
            .map(kind => ({ value: kind, label: t(`employees.profile.history.kind.${kind}`) }))} />}</Field>
        {field('decisionNumber')}{field('signedOn', 'date')}{field('effectiveOn', 'date')}
        <div className="md:col-span-2">{field('description')}</div>
        {form.kind === 'TRANSFER' ? <Field label={t(`${k}.targetUnit`)} required>{props => <Select id={props.id}
          value={form.orgUnitId} onChange={value => set('orgUnitId', value)} disabled={saving}
          placeholder={t(`${k}.chooseUnit`)} options={unitOptions} />}</Field> : null}
        {form.kind === 'PROMOTION' ? <Field label={t(`${k}.targetPosition`)} required>{props => <Select id={props.id}
          value={form.positionId} onChange={value => set('positionId', value)} disabled={saving}
          placeholder={t(`${k}.choosePosition`)} options={positionOptions} />}</Field> : null}
      </FormGrid>
      {canEditPay && form.kind !== 'DISCIPLINE' ? <label className="flex items-center gap-2 text-body"><input type="checkbox" checked={form.pay}
        disabled={saving} onChange={event => set('pay', event.target.checked)} />{t(`${k}.payChange`)}</label> : null}
      {form.pay ? <div className="flex flex-col gap-4"><FormGrid>
        {(['baseSalary', 'insuranceSalary'] as const).map(name => <Field key={name} label={t(`${k}.${name}`)}>{props =>
          <Input id={props.id} type="number" min="0" step="1" value={form[name]} disabled={saving}
            onChange={event => set(name, event.target.value)} />}</Field>)}
      </FormGrid><Field label={t(`${k}.allowances`)}>{() => <AllowancesEditor value={form.allowancesJson}
        onChange={value => set('allowancesJson', value)} optional disabled={saving} />}</Field>
      <Alert variant="info" title={t(`${k}.payPreview`)}>{form.baseSalary && amount(form.baseSalary)
        ? t(`${k}.payAmount`, { amount: formatMoney(Number(form.baseSalary)), date: form.effectiveOn || '—' })
        : t(`${k}.paySource`)}</Alert></div> : null}
      {error ? <p role="alert" className="text-caption text-danger">{error}</p> : null}
    </form>
  </Dialog>;
}
