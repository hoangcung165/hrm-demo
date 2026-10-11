// Filter "Trạng thái": every status but "Đã đóng" (the default), one status, or every status.
import { useTranslation } from 'react-i18next';
import { Select } from '@/components/ui/select';
import { PROJECT_STATUS_FILTERS, type ProjectFilters, type ProjectStatusFilter } from '../use-project-filters';

export type ProjectStatusFilterProps = {
  filters: ProjectFilters;
  id?: string;
  disabled?: boolean;
  className?: string;
};

export function ProjectStatusFilter({ filters, id, disabled, className }: ProjectStatusFilterProps) {
  const { t } = useTranslation();
  return (
    <Select
      id={id}
      aria-label={id ? undefined : t('projects.filter.status')}
      value={filters.status}
      onChange={(value) => filters.setStatus(value as ProjectStatusFilter)}
      options={PROJECT_STATUS_FILTERS.map((value) => ({ value, label: t(`projects.filter.statusOption.${value}`) }))}
      placeholder={t('projects.filter.statusOption.OPEN')}
      disabled={disabled}
      className={className}
    />
  );
}
