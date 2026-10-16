// HRM-10/FE-4. A documented DATA preview, not a rendered DOCX/PDF preview.
// No authenticated template-content or preview API exists in BE-3.
import { useState } from 'react';
import { Download, Eye, EyeOff, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ApiError } from '@/lib/api';
import { contractExportPreview } from '../document-preview';
import { downloadContractDocument, type DocumentFormat } from '../template-api';
import type { EmploymentContract } from '../api';

export function ContractExportDialog({ contract, employee, onClose }: {
  contract: EmploymentContract;
  employee: { id: string; fullName: string; code: string };
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const K = 'contractExport';
  const [formatBusy, setFormatBusy] = useState<DocumentFormat | null>(null);
  const [error, setError] = useState('');
  const [reveal, setReveal] = useState(false);
  const fields = contractExportPreview(contract, employee);
  const missing = fields.filter(x => x.missing);
  const sensitive = new Set(['base_salary', 'insurance_salary']);

  const save = async (format: DocumentFormat) => {
    if (formatBusy) return;
    setFormatBusy(format); setError('');
    try {
      await downloadContractDocument(employee.id, contract.id, format);
      setReveal(false);
      onClose();
    } catch (reason) {
      const code = reason instanceof ApiError ? reason.code : '';
      setError(t(code === 'contract_template.not_found' ? `${K}.missingTemplate`
        : reason instanceof ApiError && reason.status === 403 ? `${K}.forbidden`
        : code === 'contract_export.invalid_format' ? `${K}.invalidFormat`
        : `${K}.downloadFailed`));
    } finally { setFormatBusy(null); }
  };
  const close = () => { if (!formatBusy) { setReveal(false); onClose(); } };

  return (
    <Dialog open size="wide" onOpenChange={next => { if (!next) close(); }}
      title={t(`${K}.title`, { number: contract.contractNumber })}
      description={t(`${K}.description`)}
      busy={formatBusy !== null}
      footer={<>
        <Button variant="secondary" disabled={formatBusy !== null} onClick={close}>{t('dialog.cancel')}</Button>
        <Button variant="secondary" disabled={formatBusy !== null} onClick={() => void save('pdf')}>
          <Download aria-hidden="true" />{t(`${K}.pdf`)}
        </Button>
        <Button disabled={formatBusy !== null} onClick={() => void save('docx')}>
          <Download aria-hidden="true" />{t(`${K}.word`)}
        </Button>
      </>}>
      <div className="flex flex-col gap-4">
        <Alert variant="info" title={t(`${K}.previewNoticeTitle`)}>
          {t(`${K}.previewNotice`)}
        </Alert>

        <div className="flex items-center justify-between gap-3">
          <p className="text-body-strong">{t(`${K}.fieldsTitle`)}</p>
          <Button variant="ghost" size="sm" aria-pressed={reveal}
            onClick={() => setReveal(current => !current)}>
            {reveal ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            {t(reveal ? `${K}.hideMoney` : `${K}.showMoney`)}
          </Button>
        </div>
        <div className="rounded-md border border-line bg-surface-muted p-4">
          <div className="mb-3 flex items-center gap-2">
            <FileText aria-hidden="true" className="size-5 text-ink-muted" />
            <span className="font-medium">{t(`${K}.dataSheet`)}</span>
          </div>
          <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
            {fields.map(field => <div key={field.key} className="min-w-0">
              <dt className="text-caption text-ink-muted">{t(`${K}.fields.${field.key}`)}</dt>
              <dd className={field.missing ? 'text-warning' : 'break-words font-medium'}>
                {field.missing ? t(`${K}.emptyValue`) :
                  sensitive.has(field.key) && !reveal ? t(`${K}.maskedValue`) : field.value}
              </dd>
            </div>)}
          </dl>
        </div>
        {missing.length > 0 ? (
          <Alert variant="warning" title={t(`${K}.incompleteTitle`)}>
            {t(`${K}.incompleteDescription`, { fields: missing.map(field =>
              t(`${K}.fields.${field.key}`)).join(', ') })}
          </Alert>
        ) : null}
        {error ? <p role="alert" className="text-caption text-danger">{error}</p> : null}
      </div>
    </Dialog>
  );
}
