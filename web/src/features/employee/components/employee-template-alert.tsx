// "Chưa có file?" beside the import drop zone: downloads the import template. Busy while the server makes it; a
// failure is a danger Toast.
import { Download, LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useDownloadImportTemplate } from '../excel-api';

const BUSY = 'cursor-progress border-line bg-surface-muted text-ink-muted hover:bg-surface-muted';

export function EmployeeTemplateAlert({ className }: { className?: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const template = useDownloadImportTemplate();
  const busy = template.isPending;
  const download = () => template.mutate(undefined, { onError: () => toast({ variant: 'danger', message: t('employees.import.templateFailed') }) });
  return (
    <Alert variant="info" title={t('employees.import.noFile')} className={className}>
      <p>{t('employees.import.noFileText')}</p>
      <Button
        variant="secondary"
        size="sm"
        aria-disabled={busy || undefined}
        aria-busy={busy || undefined}
        onClick={busy ? undefined : download}
        className={cn('mt-3 text-ink', busy && BUSY)}
      >
        {busy ? <LoaderCircle aria-hidden="true" className="!size-4 animate-spin motion-reduce:animate-none" /> : <Download aria-hidden="true" className="!size-4" />}
        {t(busy ? 'employees.import.templateBusy' : 'employees.import.template')}
      </Button>
    </Alert>
  );
}
