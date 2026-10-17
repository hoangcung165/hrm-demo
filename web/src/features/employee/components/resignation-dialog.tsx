import { useEffect, useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';
import { companyTodayIso } from '@/lib/company-time';
import { formatDate } from '@/lib/format';

export function ResignationDialog({ name, hireDate, onClose, onSave, onDirty }: {
  name: string; hireDate: string; onClose: () => void;
  onSave: (body: { lastWorkingDay: string; reason: string }) => Promise<void>;
  onDirty: (dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const k = 'employees.profile.history.actions';
  const formId = useId();
  const [lastWorkingDay, setLastWorkingDay] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dirty = Boolean(lastWorkingDay || reason || confirmed);
  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  const close = () => { if (!saving) { onDirty(false); onClose(); } };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!confirmed || !lastWorkingDay || lastWorkingDay < hireDate || lastWorkingDay > companyTodayIso()
      || !reason.trim() || reason.length > 1000) { setError(t(`${k}.invalidResignation`)); return; }
    setSaving(true); setError('');
    try { await onSave({ lastWorkingDay, reason: reason.trim() }); onDirty(false); onClose(); }
    catch (e) { setError(t(`${k}.${e instanceof ApiError && e.status === 403 ? 'denied'
      : e instanceof ApiError && e.code === 'resignation.backdated' ? 'backdated'
        : e instanceof ApiError && e.code === 'account.last_admin' ? 'lastAdmin' : 'saveFailed'}`)); }
    finally { setSaving(false); }
  };
  return <Dialog open title={t(`${k}.resignationTitle`)} description={t(`${k}.resignationHelp`, { name })}
    busy={saving} onOpenChange={open => { if (!open && !dirty) close(); }}
    footer={<><Button variant="secondary" disabled={saving} onClick={close}>{t('dialog.cancel')}</Button>
      <Button variant="danger" type="submit" form={formId} disabled={saving}>{t(`${k}.saveResignation`)}</Button></>}>
    <form id={formId} onSubmit={event => void submit(event)} noValidate className="flex flex-col gap-4">
      <Field label={t(`${k}.lastWorkingDay`)} required>{props => <Input id={props.id} type="date"
        min={hireDate} max={companyTodayIso()} value={lastWorkingDay} disabled={saving}
        onChange={event => { setLastWorkingDay(event.target.value); setConfirmed(false); setError(''); }} />}</Field>
      <Field label={t(`${k}.reason`)} required>{props => <Input id={props.id} value={reason} maxLength={1000}
        disabled={saving} onChange={event => { setReason(event.target.value); setError(''); }} />}</Field>
      {lastWorkingDay ? <Alert variant="warning" title={t(`${k}.resignationWarning`, { name, date: formatDate(lastWorkingDay) })}>
        {t(`${k}.resignationEffect`)}</Alert> : null}
      <label className="flex items-start gap-2 text-body-small"><input type="checkbox" className="mt-1" checked={confirmed}
        disabled={saving || !lastWorkingDay} onChange={event => { setConfirmed(event.target.checked); setError(''); }} />
        {t(`${k}.confirmLastDay`, { date: lastWorkingDay ? formatDate(lastWorkingDay) : '—' })}</label>
      {error ? <p role="alert" className="text-caption text-danger">{error}</p> : null}
    </form>
  </Dialog>;
}
