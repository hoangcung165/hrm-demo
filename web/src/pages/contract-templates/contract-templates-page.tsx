// HRM-10/FE-4: Document templates (version list and upload only; unsupported actions are not offered).
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, UploadCloud } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Field } from '@/components/ui/field';
import { FileDropZone } from '@/components/ui/file-drop-zone';
import { Loading } from '@/components/ui/loading';
import { Select } from '@/components/ui/select';
import { StateBlock } from '@/components/ui/state-block';
import { useToast } from '@/components/ui/use-toast';
import { useCurrentAccount } from '@/features/auth/account-context';
import { ApiError } from '@/lib/api';
import { EXPORT_KEYS } from '@/features/contract/document-preview';
import {
  TEMPLATE_TYPES, contractTemplatesKey, uploadContractTemplate, useContractTemplates,
  validateDocx,
} from '@/features/contract/template-api';

const K = 'contractTemplates';
export function ContractTemplatesPage() {
  const { t } = useTranslation();
  const account = useCurrentAccount();
  const permitted = account.dataScope === 'COMPANY'
    && account.permissions.includes('EMPLOYEE_EDIT')
    && account.permissions.includes('EMPLOYEE_SENSITIVE_VIEW');
  const [type, setType] = useState<string>('FIXED_TERM');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);
  const query = useContractTemplates(type, permitted);
  const cache = useQueryClient();
  const toast = useToast();
  const denied = !permitted || (query.error instanceof ApiError && query.error.status === 403);

  const onSelect = (next: File) => {
    const code = validateDocx(next);
    setFile(code ? null : next);
    setSubmitError('');
    setFileError(code ? t(`${K}.validation.${code}`) : '');
  };
  const changeType = (next: string) => {
    setType(next); setFile(null); setFileError(''); setSubmitError('');
  };
  const upload = async () => {
    if (!file || busy || denied) return;
    setBusy(true); setSubmitError('');
    try {
      await uploadContractTemplate(type, file);
      setFile(null);
      await cache.invalidateQueries({ queryKey: contractTemplatesKey(type) });
      toast({ variant: 'success', message: t(`${K}.uploaded`) });
    } catch (error) {
      const code = error instanceof ApiError ? error.code : '';
      const translation = ({
        'contract_template.file_invalid': 'validation.type',
        'contract_template.empty': 'validation.empty',
        'contract_template.type_invalid': 'validation.invalidType',
      } as Record<string, string>)[code] ?? 'uploadFailed';
      setSubmitError(t(`${K}.${translation}`));
    } finally { setBusy(false); }
  };

  if (denied) {
    return <Card bare><StateBlock variant="denied" title={t(`${K}.deniedTitle`)}
      description={t(`${K}.deniedDescription`)} /></Card>;
  }

  const options = TEMPLATE_TYPES.map(value =>
    ({ value, label: t(`employees.profile.contracts.type.${value}`, { defaultValue: value }) }));

  return <section className="flex flex-col gap-5">
    <div>
      <h1 className="text-title">{t(`${K}.title`)}</h1>
      <p className="mt-2 text-ink-muted">{t(`${K}.description`)}</p>
    </div>

    <Card title={t(`${K}.typeTitle`)} description={t(`${K}.typeDescription`)}>
      <Field label={t(`${K}.chooseType`)} className="max-w-lg">
        {a => <Select {...a} value={type} onChange={changeType}
          options={options} placeholder={t(`${K}.chooseType`)} />}
      </Field>
      <Alert variant="info" title={t(`${K}.versionNoteTitle`)}>
        {t(`${K}.versionNote`)}
      </Alert>
      {query.isPending ? <Loading label={t(`${K}.loading`)} />
      : query.isError ? <ErrorState title={t(`${K}.loadError`)} onRetry={() => void query.refetch()} />
      : query.data?.length ? (
        <ol className="flex flex-col gap-2" aria-label={t(`${K}.versionList`)}>
          {query.data.map(template => <li key={template.id}
            className="flex flex-wrap items-center gap-3 rounded-md border border-line p-3">
            <FileText aria-hidden="true" className="size-5 shrink-0 text-brand-blue" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{template.fileName}</p>
              <p className="text-caption text-ink-muted">
                {t(`${K}.version`, { version: template.version })} · {new Date(template.uploadedAt).toLocaleDateString(t('lang') === 'en' ? 'en-GB' : 'vi-VN')}
              </p>
            </div>
            <Badge variant={template.active ? 'success' : 'neutral'}>
              {t(template.active ? `${K}.active` : `${K}.old`)}
            </Badge>
          </li>)}
        </ol>
      ) : <EmptyState icon={<FileText aria-hidden="true" />} title={t(`${K}.emptyTitle`)}
        description={t(`${K}.emptyDescription`)} />}
    </Card>

    <Card title={t(`${K}.uploadTitle`)} description={t(`${K}.uploadDescription`)}>
      <FileDropZone accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        icon={<UploadCloud />} title={t(`${K}.dropTitle`)} helper={t(`${K}.fileHint`)}
        state={busy ? 'busy' : fileError ? 'error' : file ? 'selected' : 'idle'}
        fileName={file?.name} fileSize={file?.size} error={fileError}
        statusText={t(`${K}.uploading`)} onSelect={onSelect} />
      {submitError ? <p role="alert" className="text-caption text-danger">{submitError}</p> : null}
      <div className="flex justify-end">
        <Button disabled={!file || busy} onClick={() => void upload()}>{t(`${K}.upload`)}</Button>
      </div>
    </Card>

    <Card title={t(`${K}.fieldsTitle`)} description={t(`${K}.fieldsDescription`)}>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {EXPORT_KEYS.map(name => <li key={name}><code className="rounded-sm bg-surface-muted px-2 py-1 text-caption">
          {'{{' + name + '}}'}</code></li>)}
      </ul>
      <p className="text-caption text-ink-muted">{t(`${K}.fieldsDisclaimer`)}</p>
    </Card>
  </section>;
}
