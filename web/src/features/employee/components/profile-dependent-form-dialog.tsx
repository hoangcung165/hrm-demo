// Tax dependent editor with effective-date validation; dates use native ISO date inputs.
import { useEffect, useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';
import type { Dependent } from '../profile-records-api';
import type { DependentBody } from '../profile-records-write';

type Form = { fullName: string; relationship: string; dateOfBirth: string; effectiveFrom: string; effectiveTo: string };
const initial = (record: Dependent | null): Form => ({
  fullName: record?.fullName ?? '',
  relationship: record?.relationship ?? '',
  dateOfBirth: record?.dateOfBirth ?? '',
  effectiveFrom: record?.effectiveFrom ?? '',
  effectiveTo: record?.effectiveTo ?? '',
});

export function ProfileDependentFormDialog({
  record, open, onClose, onSave, onDirty,
}: {
  record: Dependent | null;
  open: boolean;
  onClose: () => void;
  onSave: (value: DependentBody) => Promise<void>;
  onDirty: (dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const key = 'employees.profile.records.edit';
  const formId = useId();
  const [form, setForm] = useState<Form>(() => initial(record));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dirty = JSON.stringify(form) !== JSON.stringify(initial(record));
  useEffect(() => onDirty(open && dirty), [open, dirty, onDirty]);
  const field = (name: keyof Form, value: string) => {
    setForm(current => ({ ...current, [name]: value }));
    setError('');
  };
  const close = () => {
    if (saving) return;
    onDirty(false); onClose();
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.fullName.trim() || !form.relationship.trim() ||
      form.fullName.length > 150 || form.relationship.length > 80) {
      setError(t(`${key}.required`)); return;
    }
    if (form.effectiveTo && form.effectiveFrom && form.effectiveTo < form.effectiveFrom) {
      setError(t(`${key}.invalidDates`)); return;
    }
    setSaving(true); setError('');
    try {
      await onSave({ fullName: form.fullName.trim(), relationship: form.relationship.trim(),
        dateOfBirth: form.dateOfBirth || null, effectiveFrom: form.effectiveFrom || null,
        effectiveTo: form.effectiveTo || null });
      onDirty(false);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError && e.status === 403 ? t(`${key}.forbidden`)
        : t(`${key}.saveFailed`));
    } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={value => { if (!value && !dirty) close(); }}
      title={t(record ? `${key}.dependentEdit` : `${key}.dependentAdd`)}
      busy={saving}
      footer={<>
        <Button variant="secondary" disabled={saving} onClick={close}>{t('dialog.cancel')}</Button>
        <Button type="submit" form={formId} disabled={saving}>{t(`${key}.save`)}</Button>
      </>}>
      <form id={formId} onSubmit={event => void submit(event)} noValidate className="flex flex-col gap-4">
        <fieldset disabled={saving} className="flex min-w-0 flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">{t('employees.profile.fullName')}
            <Input required maxLength={150} value={form.fullName} onChange={e => field('fullName',e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">{t('employees.profile.records.dependents.relationship')}
            <Input required maxLength={80} value={form.relationship} onChange={e => field('relationship',e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">{t('employees.profile.records.dependents.dateOfBirth')}
            <Input type="date" value={form.dateOfBirth} onChange={e => field('dateOfBirth',e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">{t('employees.profile.records.dependents.from')}
            <Input type="date" value={form.effectiveFrom} onChange={e => field('effectiveFrom',e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">{t('employees.profile.records.dependents.to')}
            <Input type="date" value={form.effectiveTo} onChange={e => field('effectiveTo',e.target.value)} />
          </label>
        </fieldset>
        {error ? <p role="alert" className="text-caption text-danger">{error}</p> : null}
      </form>
    </Dialog>
  );
}
