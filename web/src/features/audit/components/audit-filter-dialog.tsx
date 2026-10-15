// "Lọc Audit log" at 390: object, person and period in a Dialog. Each choice applies at once; "Xem {n} bản ghi" closes
// the Dialog on the list, "Xóa bộ lọc" takes every filter away.
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { formatNumber } from '@/lib/format';
import type { AuditFilters } from '../use-audit-filters';
import { AuditActorFilter } from './audit-actor-filter';
import { AuditPeriodFilter } from './audit-period-filter';
import { AuditTypeFilter } from './audit-type-filter';

export type AuditFilterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: AuditFilters;
  /** How many records match now; `undefined` while the list loads. */
  total: number | undefined;
};

export function AuditFilterDialog({ open, onOpenChange, filters, total }: AuditFilterDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('audit.filter.dialogTitle')}
      className="max-md:top-auto max-md:bottom-4 max-md:translate-y-0"
      footer={
        <>
          <Button variant="secondary" className="flex-1" onClick={filters.clear}>
            {t('audit.filter.clear')}
          </Button>
          <Button className="flex-1" onClick={() => onOpenChange(false)}>
            {total === undefined ? t('audit.filter.showPending') : t('audit.filter.show', { count: total, total: formatNumber(total) })}
          </Button>
        </>
      }
    >
      <Field label={t('audit.filter.type')}>{(control) => <AuditTypeFilter filters={filters} id={control.id} className="h-11" />}</Field>
      <Field label={t('audit.filter.person')}>{(control) => <AuditActorFilter filters={filters} id={control.id} className="h-11" />}</Field>
      <AuditPeriodFilter filters={filters} className="w-full [&_button]:h-11" />
    </Dialog>
  );
}
