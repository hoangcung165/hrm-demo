// "Lọc nhân viên" at 390: the unit, position, status and order in a Dialog. Each choice applies at once, like the
// desktop bar; "Xem {n} nhân viên" closes the Dialog on the list, "Xóa bộ lọc" goes back to the defaults.
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { formatNumber } from '@/lib/format';
import type { EmployeeFilters } from '../use-employee-filters';
import { EmployeePositionFilter } from './employee-position-filter';
import { EmployeeSortFilter } from './employee-sort-filter';
import { EmployeeStatusFilter } from './employee-status-filter';
import { EmployeeUnitFilter } from './employee-unit-filter';

export type EmployeeFilterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: EmployeeFilters;
  /** The unit filter needs ORG_VIEW. */
  unitFilter: boolean;
  /** How many Employees match now; `undefined` while the list loads. */
  total: number | undefined;
};

const CONTROL = 'h-11';

export function EmployeeFilterDialog({ open, onOpenChange, filters, unitFilter, total }: EmployeeFilterDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('employees.filter.dialogTitle')}
      // A sheet at the foot of the screen, as on the artboard.
      className="max-md:top-auto max-md:bottom-4 max-md:translate-y-0"
      footer={
        <>
          <Button variant="secondary" className="flex-1" onClick={filters.clear}>
            {t('employees.filter.clear')}
          </Button>
          <Button className="flex-1" onClick={() => onOpenChange(false)}>
            {total === undefined ? t('employees.filter.showPending') : t('employees.filter.show', { count: total, total: formatNumber(total) })}
          </Button>
        </>
      }
    >
      {unitFilter ? (
        <Field label={t('employees.filter.unit')} helper={filters.query.includeSubUnits ? t('employees.filter.includeSubUnits') : undefined}>
          {(control) => <EmployeeUnitFilter filters={filters} id={control.id} className={CONTROL} />}
        </Field>
      ) : null}
      <Field label={t('employees.filter.position')}>{(control) => <EmployeePositionFilter filters={filters} id={control.id} className={CONTROL} />}</Field>
      <Field label={t('employees.filter.status')}>{(control) => <EmployeeStatusFilter filters={filters} id={control.id} className={CONTROL} />}</Field>
      <Field label={t('employees.filter.sort')}>{(control) => <EmployeeSortFilter filters={filters} id={control.id} className={CONTROL} />}</Field>
    </Dialog>
  );
}
