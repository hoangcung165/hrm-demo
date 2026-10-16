// HRM-10/FE-2: signed contracts create salary snapshots; monetary changes require an amendment.
import { useEffect, useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { FormGrid } from '@/components/ui/form-grid';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatMoney } from '@/lib/format';
import { ApiError } from '@/lib/api';
import type { EmploymentContract } from '../api';
import { contractDefaults, CONTRACT_KINDS, parseAllowances, probationPay, validMoney, validateContract } from '../contract-rules';
import type { ContractWrite } from '../write';

type Form = {
  contractNumber: string; contractType: string; signedOn: string;
  startsOn: string; endsOn: string; baseSalary: string; insuranceSalary: string;
  referenceSalary: string; allowancesJson: string; insured: boolean; taxMethod: string; overrideReason: string;
};

const initial = (value: EmploymentContract | null): Form => ({
  contractNumber: value?.contractNumber ?? '',
  contractType: value?.contractType ?? 'FIXED_TERM',
  signedOn: value?.signedOn ?? '',
  startsOn: value?.startsOn ?? '',
  endsOn: value?.endsOn ?? '',
  baseSalary: value?.baseSalary?.toString() ?? '',
  insuranceSalary: value?.insuranceSalary?.toString() ?? '',
  referenceSalary: '', allowancesJson: value?.allowancesJson ?? '[]',
  insured: value?.insured ?? true, taxMethod: value?.taxMethod ?? 'PROGRESSIVE',
  overrideReason: '',
});

const apiErrorKey = (error: unknown) => error instanceof ApiError ? ({
  'contract.overlap': 'overlap',
  'contract.number_taken': 'numberTaken',
  'contract.salary_change_requires_amendment': 'immutable',
  'contract.override_reason_required': 'reason',
  'contract.invalid_fields': 'required',
  'employee.not_found': 'forbidden',
  'auth.forbidden': 'forbidden',
}[error.code] ?? (error.status === 403 ? 'forbidden' : 'saveFailed')) : 'saveFailed';

export function ContractFormDialog({ contract, contracts, onClose, onSave, onDirty }: {
  contract: EmploymentContract | null;
  contracts: EmploymentContract[];
  onClose: () => void;
  onSave: (body: ContractWrite) => Promise<void>;
  onDirty: (dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const key = 'employees.profile.contracts.manage';
  const formId = useId();
  const [form, setForm] = useState<Form>(() => initial(contract));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const editing = contract !== null;
  const dirty = JSON.stringify(form) !== JSON.stringify(initial(contract));
  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  const defaults = contractDefaults(form.contractType);
  const hasOverride = form.insured !== defaults.insured || form.taxMethod !== defaults.taxMethod;
  const typeOptions = CONTRACT_KINDS.map(kind => ({
    value: kind,
    label: t(`employees.profile.contracts.type.${kind}`, { defaultValue: kind }),
  }));
  const taxOptions = ['PROGRESSIVE', 'WITHHOLD_10'].map(method => ({
    value: method, label: t(`employees.profile.contracts.taxMethod.${method}`),
  }));
  const set = <K extends keyof Form>(name: K, value: Form[K]) => {
    setForm(previous => ({ ...previous, [name]: value }));
    setError('');
  };
  const changeType = (type: string) => {
    const next = contractDefaults(type);
    setForm(previous => ({
      ...previous, contractType: type, insured: next.insured, taxMethod: next.taxMethod,
      insuranceSalary: next.insured ? previous.insuranceSalary : '',
      referenceSalary: '', baseSalary: previous.baseSalary,
      overrideReason: '',
    }));
    setError('');
  };
  const close = () => {
    if (saving) return;
    onDirty(false);
    onClose();
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body: ContractWrite = {
      contractNumber: form.contractNumber.trim(), contractType: form.contractType,
      signedOn: form.signedOn, startsOn: form.startsOn,
      endsOn: form.endsOn || null, baseSalary: Number(form.baseSalary),
      insuranceSalary: form.insuranceSalary.trim() === '' ? null : Number(form.insuranceSalary),
      allowancesJson: form.allowancesJson.trim(), insured: form.insured,
      taxMethod: form.taxMethod, overrideReason: hasOverride ? form.overrideReason.trim() || null : null,
    };
    if (!editing && (!validMoney(form.baseSalary)
        || form.insuranceSalary.trim() !== '' && !validMoney(form.insuranceSalary))) {
      setError(t(`${key}.salary`)); return;
    }
    const check = validateContract(body, contracts, contract?.id);
    if (check !== null) {
      setError(t(`${key}.${check}`)); return;
    }
    if (editing && contract && (body.startsOn !== contract.startsOn || body.endsOn !== contract.endsOn
      || body.baseSalary !== contract.baseSalary || body.insuranceSalary !== contract.insuranceSalary
      || body.allowancesJson !== contract.allowancesJson || body.insured !== contract.insured
      || body.taxMethod !== contract.taxMethod)) {
      setError(t(`${key}.immutable`)); return;
    }
    setSaving(true); setError('');
    try {
      await onSave(body);
      onDirty(false);
      onClose();
    } catch (e) {
      setError(t(`${key}.${apiErrorKey(e)}`));
    } finally {
      setSaving(false);
    }
  };
  const field = (label: string, name: keyof Form, type: string = 'text', required = false) => (
    <Field label={label} required={required}>{props => (
      <Input id={props.id} aria-required={props['aria-required']} aria-describedby={props['aria-describedby']}
        type={type} value={String(form[name])} required={required}
        disabled={saving || editing && name === 'startsOn'} onChange={event => set(name, event.target.value as never)} />
    )}</Field>
  );
  const pay = Number(form.baseSalary);
  return (
    <Dialog open onOpenChange={open => { if (!open) close(); }}
      title={t(`${key}.${editing ? 'editTitle' : 'createTitle'}`)}
      description={t(`${key}.${editing ? 'editDescription' : 'createDescription'}`)}
      busy={saving} size="wide"
      footer={<>
        <Button variant="secondary" disabled={saving} onClick={close}>{t('dialog.cancel')}</Button>
        <Button type="submit" form={formId} disabled={saving}>{t(`${key}.save`)}</Button>
      </>}>
      <form id={formId} noValidate onSubmit={event => void submit(event)} className="flex flex-col gap-4">
        <FormGrid>
          {field(t(`${key}.number`), 'contractNumber', 'text', true)}
          <Field label={t(`${key}.type`)} required>{props =>
            <Select id={props.id} aria-required value={form.contractType} disabled={saving || editing}
              onChange={changeType} placeholder={t(`${key}.type`)} options={typeOptions} />
          }</Field>
          {field(t(`${key}.signed`), 'signedOn', 'date', true)}
          {field(t(`${key}.starts`), 'startsOn', 'date', true)}
          <div className="md:col-span-2">
            <Field label={t(`${key}.ends`)} helper={t(`${key}.endsHint`)}>{props =>
              <Input type="date" id={props.id} value={form.endsOn} disabled={saving || editing}
                onChange={event => set('endsOn', event.target.value)} />
            }</Field>
          </div>
          {form.contractType === 'PROBATION' && !editing ? (
            <div className="md:col-span-2">
              <Field label={t(`${key}.referenceSalary`)} helper={t(`${key}.probationHint`)}>{props =>
                <Input id={props.id} inputMode="decimal" value={form.referenceSalary} disabled={saving}
                  onChange={event => {
                    const value = event.target.value;
                    setForm(previous => ({ ...previous, referenceSalary: value,
                      baseSalary: validMoney(value) ? String(probationPay(Number(value))) : '' }));
                    setError('');
                  }} />
              }</Field>
            </div>
          ) : null}
          <Field label={t(`${key}.baseSalary`)} required>{props =>
            <Input id={props.id} inputMode="decimal" value={form.baseSalary} disabled={saving || editing}
              onChange={event => set('baseSalary', event.target.value)} />
          }</Field>
          <Field label={t(`${key}.insuranceSalary`)}>{props =>
            <Input id={props.id} inputMode="decimal" value={form.insuranceSalary} disabled={saving || editing}
              onChange={event => set('insuranceSalary', event.target.value)} />
          }</Field>
          <div className="md:col-span-2">
            <Field label={t(`${key}.allowances`)} helper={t(`${key}.allowancesHint`)}>{props =>
              <Textarea id={props.id} rows={2} value={form.allowancesJson}
                disabled={saving || editing} onChange={event => set('allowancesJson', event.target.value)} />
            }</Field>
          </div>
          <label className="flex items-center gap-2 text-body md:col-span-2">
            <input type="checkbox" checked={form.insured} disabled={saving || editing}
              onChange={event => set('insured', event.target.checked)} />
            {t(`${key}.insured`)}
          </label>
          <Field label={t(`${key}.tax`)}>{props =>
            <Select id={props.id} value={form.taxMethod} disabled={saving || editing}
              onChange={value => set('taxMethod', value)} placeholder={t(`${key}.tax`)} options={taxOptions} />
          }</Field>
          {hasOverride && !editing ? (
            <Field label={t(`${key}.overrideReason`)} required>{props =>
              <Input id={props.id} value={form.overrideReason} disabled={saving}
                onChange={event => set('overrideReason', event.target.value)} />
            }</Field>
          ) : null}
        </FormGrid>
        {!editing && Number.isFinite(pay) && validMoney(form.baseSalary) && parseAllowances(form.allowancesJson) !== null ? (
          <Alert variant="info" title={t(`${key}.previewTitle`)}>
            {t(`${key}.previewDescription`, { amount: formatMoney(pay), date: form.startsOn || '—' })}
          </Alert>
        ) : null}
        {editing ? <p className="text-caption text-ink-muted">{t(`${key}.immutableHint`)}</p> : null}
        {error ? <p role="alert" className="text-caption text-danger">{error}</p> : null}
      </form>
    </Dialog>
  );
}
