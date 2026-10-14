import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Select } from '@/components/ui/select';
import { ApiError } from '@/lib/api';
import { formatFileSize } from '@/lib/format';
import type { Attachment } from '../profile-documents-api';
import type { CertificateBody, EmployeeCertificate } from '../profile-qualifications-api';
import { certificateFormSchema, type CertificateFormValues } from '../profile-qualifications-schemas';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = /\.(pdf|png|jpe?g|docx|xlsx)$/i;

export type ProfileCertificateFormDialogProps = {
  record: EmployeeCertificate | null;
  attachments: Attachment[];
  canEditFiles: boolean;
  onSave: (body: CertificateBody, file: File | null) => Promise<void>;
  onClose: () => void;
  onDirty: (value: boolean) => void;
};

export function ProfileCertificateFormDialog({ record, attachments, canEditFiles, onSave, onClose, onDirty }: ProfileCertificateFormDialogProps) {
  const { t } = useTranslation();
  const k = 'employees.profile.qualifications';
  const formId = useId();
  const attachmentFieldId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const form = useForm<CertificateFormValues>({ resolver: zodResolver(certificateFormSchema), mode: 'onTouched',
    defaultValues: { name: record?.name ?? '', issuer: record?.issuer ?? '', issuedAt: record?.issuedAt ?? '',
      expiresAt: record?.expiresAt ?? '', attachmentId: record?.attachmentId ?? '' } });
  const { isDirty, isSubmitting, errors } = form.formState;
  useEffect(() => onDirty(isDirty || file !== null), [isDirty, file, onDirty]);
  const close = () => { if (!isSubmitting) { onDirty(false); onClose(); } };
  const submit = form.handleSubmit(async value => {
    if (file && (file.size === 0 || file.size > MAX_BYTES || !ALLOWED.test(file.name))) {
      setFileError(t(`${k}.invalidFile`)); return;
    }
    try {
      await onSave({ name: value.name, issuer: value.issuer || null, issuedAt: value.issuedAt || null,
        expiresAt: value.expiresAt || null, attachmentId: file ? null : value.attachmentId || null }, file);
      onDirty(false); onClose();
    } catch (error) {
      form.setError('root', { message: error instanceof ApiError && error.status === 403 ? `${k}.forbidden` : `${k}.saveFailed` });
    }
  });
  const options = attachments.map(each => ({ value: each.id, label: each.fileName }));
  return (
    <Dialog open onOpenChange={value => { if (!value && !isDirty && !file) close(); }}
      title={t(record ? `${k}.editCertificate` : `${k}.addCertificate`)} busy={isSubmitting}
      footer={<><Button variant="secondary" disabled={isSubmitting} onClick={close}>{t('dialog.cancel')}</Button>
        <Button type="submit" form={formId} disabled={isSubmitting}>{t(`${k}.save`)}</Button></>}>
      <FormProvider {...form}>
        <form id={formId} onSubmit={event => void submit(event)} noValidate className="flex flex-col gap-4">
          <FormField<CertificateFormValues> name="name" label={t(`${k}.certificateName`)} required maxLength={150} disabled={isSubmitting} />
          <FormField<CertificateFormValues> name="issuer" label={t(`${k}.issuer`)} maxLength={150} disabled={isSubmitting} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField<CertificateFormValues> name="issuedAt" label={t(`${k}.issuedAt`)} type="date" disabled={isSubmitting} />
            <FormField<CertificateFormValues> name="expiresAt" label={t(`${k}.expiresAt`)} type="date" disabled={isSubmitting} />
          </div>
          {canEditFiles ? <div className="flex flex-col gap-3 border-t border-line pt-4">
            {options.length ? <>
              <label htmlFor={attachmentFieldId} className="text-sm font-medium">{t(`${k}.attachment`)}</label>
              <Controller name="attachmentId" control={form.control} render={({ field }) => (
                <Select id={attachmentFieldId} value={file ? '' : field.value} onChange={value => { setFile(null); field.onChange(value); }}
                  options={options} placeholder={t(`${k}.noAttachment`)} disabled={isSubmitting} />
              )} />
            </> : null}
            {form.watch('attachmentId') || file ? <button type="button" className="self-start text-sm text-brand-blue hover:underline"
              disabled={isSubmitting} onClick={() => { form.setValue('attachmentId', '', { shouldDirty: true }); setFile(null); }}>
              {t(`${k}.removeAttachment`)}
            </button> : null}
            <label className="flex flex-col gap-1 text-sm font-medium">{t(`${k}.uploadFile`)}
              <input type="file" accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx" disabled={isSubmitting}
                className="text-body font-normal file:mr-3 file:rounded-sm file:border file:border-line file:bg-surface file:px-3 file:py-2 file:text-ink"
                onChange={event => { const chosen = event.currentTarget.files?.[0] ?? null; setFile(chosen); setFileError('');
                  if (chosen) form.setValue('attachmentId', '', { shouldDirty: true }); }} />
            </label>
            <p className="text-caption text-ink-muted">{t(`${k}.fileHint`, { size: formatFileSize(MAX_BYTES) })}</p>
            {fileError ? <p role="alert" className="text-caption text-danger">{fileError}</p> : null}
          </div> : null}
          {errors.root ? <p role="alert" className="text-caption text-danger">{t(errors.root.message!)}</p> : null}
        </form>
      </FormProvider>
    </Dialog>
  );
}
