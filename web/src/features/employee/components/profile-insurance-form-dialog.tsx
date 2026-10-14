// HRM-08/FE-2B: only the participation date, BHYT registration place and card are editable.
// BHXH number belongs to Employee identity; contribution salary belongs to Salary Profile.
import { useEffect, useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';
import type { Insurance } from '../profile-records-api';
import type { InsuranceWrite } from '../profile-insurance-write';

type Fields = { participationDate: string; healthRegistrationPlace: string; healthInsuranceNumber: string };
const initial = (record: Insurance): Fields => ({
  participationDate: record.participationDate ?? '',
  healthRegistrationPlace: record.healthRegistrationPlace ?? '',
  healthInsuranceNumber: record.masked ? '' : record.healthInsuranceNumber ?? '',
});

export function ProfileInsuranceFormDialog({
  record, onClose, onSave, onDirty,
}: {
  record: Insurance;
  onClose: () => void;
  onSave: (body: InsuranceWrite) => Promise<void>;
  onDirty: (dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const key = 'employees.profile.records.insuranceEdit';
  const formId = useId();
  const [fields, setFields] = useState<Fields>(() => initial(record));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dirty = JSON.stringify(fields) !== JSON.stringify(initial(record));
  useEffect(() => onDirty(dirty), [dirty, onDirty]);

  const close = () => {
    if (saving) return;
    onDirty(false);
    onClose();
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const place = fields.healthRegistrationPlace.trim();
    const number = fields.healthInsuranceNumber.trim();
    if (place.length > 200 || number.length > 40) {
      setError(t(`${key}.tooLong`)); return;
    }
    // Never re-submit an API-masked health card number as the real value.
    if (record.masked || number.includes('•') || number.includes('*')) {
      setError(t(`${key}.masked`)); return;
    }
    const date = fields.participationDate;
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError(t(`${key}.invalidDate`)); return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        participationDate: date || null,
        healthRegistrationPlace: place || null,
        healthInsuranceNumber: number || null,
      });
      onDirty(false);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError && e.status === 403 ? t(`${key}.forbidden`)
        : e instanceof ApiError && e.status === 400 ? t(`${key}.invalid`)
        : t(`${key}.saveFailed`));
    } finally {
      setSaving(false);
    }
  };
  const change = (name: keyof Fields, value: string) => {
    setFields(current => ({ ...current, [name]: value }));
    setError('');
  };
  return (
    <Dialog open onOpenChange={next => { if (!next && !dirty) close(); }}
      title={t(`${key}.title`)}
      description={t(`${key}.description`)}
      busy={saving}
      footer={<>
        <Button variant="secondary" disabled={saving} onClick={close}>{t('dialog.cancel')}</Button>
        <Button form={formId} type="submit" disabled={saving}>{t(`${key}.save`)}</Button>
      </>}>
      <form id={formId} noValidate onSubmit={event => void submit(event)} className="flex flex-col gap-4">
        <fieldset disabled={saving} className="flex min-w-0 flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            {t('employees.profile.records.insurance.participation')}
            <Input type="date" value={fields.participationDate}
              onChange={e => change('participationDate', e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            {t('employees.profile.records.insurance.healthPlace')}
            <Input maxLength={200} value={fields.healthRegistrationPlace}
              onChange={e => change('healthRegistrationPlace', e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            {t('employees.profile.records.insurance.healthNumber')}
            <Input autoComplete="off" maxLength={40} value={fields.healthInsuranceNumber}
              onChange={e => change('healthInsuranceNumber', e.target.value)} />
          </label>
          <p className="text-caption text-ink-muted">{t(`${key}.identityNote`)}</p>
        </fieldset>
        {error ? <p role="alert" className="text-caption text-danger">{error}</p> : null}
      </form>
    </Dialog>
  );
}
