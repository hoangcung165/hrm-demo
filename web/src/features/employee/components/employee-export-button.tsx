// "Xuất Excel" in the page header of the employee list (desktop). Busy while the file is made: it looks disabled
// and ignores clicks but keeps the focus.
import { Download, LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// The look of a disabled Button.
const BUSY = 'cursor-progress border-line bg-surface-muted text-ink-muted hover:bg-surface-muted';

export type EmployeeExportButtonProps = {
  busy: boolean;
  /** The list is loading, failed, or has no row. */
  disabled: boolean;
  /** Why it is disabled, as the button's title: there is no row to export. */
  emptyHint?: string;
  onExport: () => void;
};

export function EmployeeExportButton({ busy, disabled, emptyHint, onExport }: EmployeeExportButtonProps) {
  const { t } = useTranslation();
  return (
    <Button
      variant="secondary"
      disabled={disabled && !busy}
      title={disabled && !busy ? emptyHint : undefined}
      aria-disabled={busy || undefined}
      aria-busy={busy || undefined}
      onClick={busy ? undefined : onExport}
      className={cn(busy && BUSY)}
    >
      {busy ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : <Download aria-hidden="true" />}
      {t(busy ? 'employees.excel.exporting' : 'employees.excel.export')}
    </Button>
  );
}
