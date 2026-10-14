// Bank form never opens with a masked number. The existing salary-default account cannot be unset on its own.
import { useEffect, useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';
import type { BankAccount } from '../profile-records-api';
import type { BankBody } from '../profile-records-write';

const initial = (record: BankAccount | null): BankBody => ({
  bankName: record?.bankName ?? '',
  accountNumber: record?.masked ? '' : record?.accountNumber ?? '',
  accountHolder: record?.accountHolder ?? '',
  defaultAccount: record?.defaultAccount ?? false,
});

export function ProfileBankFormDialog({
  record, open, onClose, onSave, onDirty,
}: {
  record: BankAccount | null;
  open: boolean;
  onClose: () => void;
  onSave: (value: BankBody) => Promise<void>;
  onDirty: (dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<BankBody>(() => initial(record));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const formId = useId();
  const key = 'employees.profile.records.edit';
  const dirty = JSON.stringify(form) !== JSON.stringify(initial(record));
  useEffect(() => onDirty(open && dirty), [open, dirty, onDirty]);
  const field = (name: keyof BankBody, value: string | boolean) => {
    setForm(current => ({ ...current, [name]: value }));
    setError('');
  };
  const close = () => {
    if (saving) return;
    onDirty(false);
    onClose();
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = form.bankName.trim();
    const number = form.accountNumber.trim();
    const holder = form.accountHolder.trim();
    if (!name || !number || !holder || name.length > 150 || holder.length > 150 || number.length > 50) {
      setError(t(`${key}.required`)); return;
    }
    if (number.includes('•')) {
      setError(t(`${key}.maskedNumber`)); return;
    }
    setSaving(true); setError('');
    try {
      await onSave({ bankName: name, accountNumber: number, accountHolder: holder,
        defaultAccount: record?.defaultAccount ? true : form.defaultAccount });
      onDirty(false);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError && e.status === 403 ? t(`${key}.forbidden`)
        : e instanceof ApiError && e.code === 'employee.default_bank_required'
        ? t(`${key}.defaultRequired`) : t(`${key}.saveFailed`));
    } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={value => { if (!value && !dirty) close(); }}
      title={t(record ? `${key}.bankEdit` : `${key}.bankAdd`)}
      busy={saving}
      footer={<>
        <Button variant="secondary" disabled={saving} onClick={close}>{t('dialog.cancel')}</Button>
        <Button type="submit" form={formId} disabled={saving}>{t(`${key}.save`)}</Button>
      </>}>
      <form id={formId} onSubmit={event => void submit(event)} noValidate className="flex flex-col gap-4">
        <fieldset disabled={saving} className="flex min-w-0 flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">{t(`${key}.bankName`)}
            <Input required maxLength={150} value={form.bankName} onChange={e => field('bankName', e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">{t(`${key}.accountHolder`)}
            <Input required maxLength={150} value={form.accountHolder} onChange={e => field('accountHolder', e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">{t(`${key}.accountNumber`)}
            <Input required maxLength={50} autoComplete="off" value={form.accountNumber}
              onChange={e => field('accountNumber', e.target.value)} />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={form.defaultAccount || record?.defaultAccount === true}
              disabled={record?.defaultAccount === true}
              onChange={e => field('defaultAccount', e.target.checked)} />
            {t(`${key}.salaryDefault`)}
          </label>
        </fieldset>
        {error ? <p role="alert" className="text-caption text-danger">{error}</p> : null}
      </form>
    </Dialog>
  );
}
