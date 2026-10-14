import { useEffect, useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { ExpatDocument, ExpatDocumentBody, ExpatDocumentType } from '../profile-documents-api';

type Form = { documentType: ExpatDocumentType; documentNumber: string; issuingCountry: string;
  issuedAt: string; expiresAt: string };
const initial = (document: ExpatDocument | null): Form => ({
  documentType: document?.documentType ?? 'PASSPORT',
  documentNumber: document && !document.masked ? document.documentNumber : '',
  issuingCountry: document?.issuingCountry ?? 'VN',
  issuedAt: document?.issuedAt ?? '', expiresAt: document?.expiresAt ?? '',
});
const TYPES: ExpatDocumentType[] = ['PASSPORT','VISA','WORK_PERMIT'];

export function ProfileExpatForm({ document, onClose, onSave, onDirty }: {
  document: ExpatDocument | null;
  onClose: () => void;
  onSave: (body: ExpatDocumentBody) => Promise<void>;
  onDirty: (value: boolean) => void;
}) {
  const { t } = useTranslation();
  const k = 'employees.profile.documents';
  const [form, setForm] = useState<Form>(() => initial(document));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const formId = useId();
  const dirty = JSON.stringify(form) !== JSON.stringify(initial(document));
  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  const change = (field: keyof Form, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
    setError('');
  };
  const close = () => { if (!saving) { onDirty(false); onClose(); } };
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const number = form.documentNumber.trim().toUpperCase();
    const country = form.issuingCountry.trim().toUpperCase();
    if (!/^[A-Z0-9-]{3,40}$/.test(number) || !/^[A-Z]{2}$/.test(country) ||
        !form.expiresAt || (form.issuedAt && form.expiresAt < form.issuedAt)) {
      setError(t(`${k}.invalid`)); return;
    }
    if (document?.masked || number.includes('•')) { setError(t(`${k}.masked`)); return; }
    setSaving(true);
    try {
      await onSave({
        documentType: form.documentType, documentNumber: number, issuingCountry: country,
        issuedAt: form.issuedAt || null, expiresAt: form.expiresAt,
      });
      onDirty(false); onClose();
    } catch { setError(t(`${k}.writeFailed`)); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open onOpenChange={next => { if (!next && !dirty) close(); }}
      title={t(document ? `${k}.edit` : `${k}.add`)} busy={saving}
      footer={<>
        <Button variant="secondary" disabled={saving} onClick={close}>{t('dialog.cancel')}</Button>
        <Button type="submit" form={formId} disabled={saving}>{t(`${k}.save`)}</Button>
      </>}>
      <form id={formId} noValidate onSubmit={e => void submit(e)} className="flex flex-col gap-4">
        <fieldset disabled={saving} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            {t(`${k}.type`)}
            <Select value={form.documentType} onChange={v => change('documentType',v)}
              options={TYPES.map(type => ({value:type,label:t(`${k}.typeNames.${type}`)}))}
              placeholder={t(`${k}.type`)} aria-label={t(`${k}.type`)} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            {t(`${k}.number`)}
            <Input value={form.documentNumber} autoComplete="off" maxLength={40} required
              onChange={e => change('documentNumber',e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            {t(`${k}.country`)}
            <Input value={form.issuingCountry} maxLength={2} required
              onChange={e => change('issuingCountry',e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            {t(`${k}.issued`)}
            <Input type="date" value={form.issuedAt} onChange={e => change('issuedAt',e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            {t(`${k}.expires`)}
            <Input type="date" required value={form.expiresAt} onChange={e => change('expiresAt',e.target.value)} />
          </label>
        </fieldset>
        {error ? <p role="alert" className="text-caption text-danger">{error}</p> : null}
      </form>
    </Dialog>
  );
}
