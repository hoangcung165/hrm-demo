// HRM-10/FE-2: amendments are the only route to alter effective-dated salary after a contract is signed.
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
import { AllowancesEditor } from './allowances-editor';
import { companyTodayIso } from '@/lib/company-time';
import type { EmploymentContract } from '../api';
import { validMoney, validateAmendment } from '../contract-rules';
import type { AmendmentWrite } from '../write';

type Form = {
  amendmentNumber: string; signedOn: string; effectiveOn: string;
  description: string; baseSalary: string; insuranceSalary: string; allowancesJson: string;
  insured: string; taxMethod: string; overrideReason: string;
};
const initial = (): Form => ({
  amendmentNumber: '', signedOn: companyTodayIso(), effectiveOn: companyTodayIso(),
  description: '', baseSalary: '', insuranceSalary: '', allowancesJson: '',
  insured: 'KEEP', taxMethod: 'KEEP', overrideReason: '',
});

const errorKey = (error: unknown) => error instanceof ApiError ? ({
  'contract.invalid_amendment': 'required',
  'contract.amendment_outside_term': 'date',
  'contract.amendment_number_taken': 'numberTaken',
  'salary_profile.same_effective_date': 'sameDate',
  'salary_profile.no_source': 'noSource',
  'salary_profile.override_reason_required': 'reason',
  'auth.forbidden': 'forbidden',
}[error.code] ?? (error.status === 403 ? 'forbidden' : 'saveFailed')) : 'saveFailed';

export function AmendmentFormDialog({ contract, onClose, onSave, onDirty }: {
  contract: EmploymentContract;
  onClose: () => void;
  onSave: (body: AmendmentWrite) => Promise<void>;
  onDirty: (dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const key = 'employees.profile.contracts.manage';
  const formId = useId();
  const [form, setForm] = useState<Form>(initial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial());
  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  const set = (field: keyof Form, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
    setError('');
  };
  const close = () => { if (!saving) { onDirty(false); onClose(); } };
  const changedInsurance = form.insured !== 'KEEP' && (form.insured === 'true') !== contract.insured;
  const changedTax = form.taxMethod !== 'KEEP' && form.taxMethod !== contract.taxMethod;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body: AmendmentWrite = {
      amendmentNumber: form.amendmentNumber.trim(),
      signedOn: form.signedOn, effectiveOn: form.effectiveOn, description: form.description.trim(),
      baseSalary: form.baseSalary.trim() === '' ? null : Number(form.baseSalary),
      insuranceSalary: form.insuranceSalary.trim() === '' ? null : Number(form.insuranceSalary),
      allowancesJson: form.allowancesJson.trim() === '' ? null : form.allowancesJson.trim(),
      insured: form.insured === 'KEEP' ? null : form.insured === 'true',
      taxMethod: form.taxMethod === 'KEEP' ? null : form.taxMethod,
      overrideReason: changedInsurance || changedTax ? form.overrideReason.trim() || null : null,
    };
    if (form.baseSalary.trim() !== '' && !validMoney(form.baseSalary)
      || form.insuranceSalary.trim() !== '' && !validMoney(form.insuranceSalary)) {
      setError(t(`${key}.salary`)); return;
    }
    const invalid = validateAmendment(body, contract);
    if (invalid) { setError(t(`${key}.${invalid}`)); return; }
    setSaving(true); setError('');
    try {
      await onSave(body);
      onDirty(false);
      onClose();
    } catch (e) {
      setError(t(`${key}.${errorKey(e)}`));
    } finally { setSaving(false); }
  };
  const control = (name: keyof Form, label: string, type = 'text', required = false) =>
    <Field label={label} required={required}>{props =>
      <Input id={props.id} type={type} inputMode={name.toLowerCase().includes('salary') ? 'decimal' : undefined}
        value={form[name]} required={required} disabled={saving}
        onChange={event => set(name, event.target.value)} />
    }</Field>;

  return <Dialog open size="wide" busy={saving} onOpenChange={open => { if (!open) close(); }}
    title={t(`${key}.amendmentTitle`, { number: contract.contractNumber })}
    description={t(`${key}.amendmentDescription`)}
    footer={<>
      <Button variant="secondary" disabled={saving} onClick={close}>{t('dialog.cancel')}</Button>
      <Button form={formId} type="submit" disabled={saving}>{t(`${key}.saveAmendment`)}</Button>
    </>}>
    <form id={formId} noValidate className="flex flex-col gap-4" onSubmit={event => void submit(event)}>
      <FormGrid>
        {control('amendmentNumber', t(`${key}.amendmentNumber`), 'text', true)}
        {control('signedOn', t(`${key}.signed`), 'date', true)}
        <div className="md:col-span-2">{control('effectiveOn', t(`${key}.effectiveOn`), 'date', true)}</div>
        <div className="md:col-span-2">
          <Field label={t(`${key}.description`)} required>{props =>
            <Textarea id={props.id} rows={2} required value={form.description}
              disabled={saving} onChange={event => set('description', event.target.value)} />
          }</Field>
        </div>
        {control('baseSalary', t(`${key}.newSalary`))}
        {control('insuranceSalary', t(`${key}.newInsuranceSalary`))}
        <div className="md:col-span-2">
          <p className="mb-2 font-medium">{t(`${key}.newAllowances`)}</p>
          <AllowancesEditor value={form.allowancesJson} disabled={saving} optional
            onChange={value => set('allowancesJson', value)} />
        </div>
        <Field label={t(`${key}.insured`)}>{props =>
          <Select id={props.id} value={form.insured} disabled={saving}
            placeholder={t(`${key}.insured`)}
            options={[
              { value: 'KEEP', label: t(`${key}.keep`) },
              { value: 'true', label: t('employees.profile.contracts.yes') },
              { value: 'false', label: t('employees.profile.contracts.no') },
            ]} onChange={v => set('insured', v)} />
        }</Field>
        <Field label={t(`${key}.tax`)}>{props =>
          <Select id={props.id} value={form.taxMethod} disabled={saving}
            placeholder={t(`${key}.tax`)}
            options={[
              { value: 'KEEP', label: t(`${key}.keep`) },
              ...['PROGRESSIVE', 'WITHHOLD_10'].map(value => ({
                value, label: t(`employees.profile.contracts.taxMethod.${value}`),
              })),
            ]} onChange={v => set('taxMethod', v)} />
        }</Field>
        {(changedInsurance || changedTax) ? (
          <div className="md:col-span-2">
            {control('overrideReason', t(`${key}.overrideReason`), 'text', true)}
          </div>
        ) : null}
      </FormGrid>
      <Alert variant="info" title={t(`${key}.amendmentPreviewTitle`)}>
        {t(`${key}.amendmentPreview`, {
          date: form.effectiveOn || '—',
          amount: form.baseSalary.trim() !== '' && validMoney(form.baseSalary)
            ? formatMoney(Number(form.baseSalary)) : t(`${key}.keep`),
        })}
      </Alert>
      {error ? <p role="alert" className="text-caption text-danger">{error}</p> : null}
    </form>
  </Dialog>;
}
