// "Lọc dự án" at 390: status, owning unit and "Chỉ dự án có người quá tải" in a Dialog. Each choice applies at once;
// "Xem {n} dự án" closes the Dialog on the list, "Xóa bộ lọc" goes back to the defaults.
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { formatNumber } from '@/lib/format';
import type { ProjectFilters } from '../use-project-filters';
import { ProjectOverloadFilter } from './project-overload-filter';
import { ProjectStatusFilter } from './project-status-filter';
import { ProjectUnitFilter } from './project-unit-filter';

export type ProjectFilterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ProjectFilters;
  /** How many projects match now; `undefined` while the list loads. */
  total: number | undefined;
};

export function ProjectFilterDialog({ open, onOpenChange, filters, total }: ProjectFilterDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('projects.filter.dialogTitle')}
      className="max-md:top-auto max-md:bottom-4 max-md:translate-y-0"
      footer={
        <>
          <Button variant="secondary" className="flex-1" onClick={filters.clear}>
            {t('projects.filter.clear')}
          </Button>
          <Button className="flex-1" onClick={() => onOpenChange(false)}>
            {total === undefined ? t('projects.filter.showPending') : t('projects.filter.show', { count: total, total: formatNumber(total) })}
          </Button>
        </>
      }
    >
      <Field label={t('projects.filter.status')}>{(control) => <ProjectStatusFilter filters={filters} id={control.id} className="h-11" />}</Field>
      <Field label={t('projects.filter.unit')}>{(control) => <ProjectUnitFilter filters={filters} id={control.id} className="h-11" />}</Field>
      <ProjectOverloadFilter filters={filters} className="min-h-11" />
    </Dialog>
  );
}
