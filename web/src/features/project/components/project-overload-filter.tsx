// Checkbox "Chỉ dự án có người quá tải": projects with someone above 100% from today on.
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import type { ProjectFilters } from '../use-project-filters';

export type ProjectOverloadFilterProps = {
  filters: ProjectFilters;
  disabled?: boolean;
  className?: string;
};

export function ProjectOverloadFilter({ filters, disabled, className }: ProjectOverloadFilterProps) {
  const { t } = useTranslation();
  return (
    <Checkbox checked={filters.query.overloaded} disabled={disabled} onChange={(event) => filters.setOverloaded(event.target.checked)} className={className}>
      {t('projects.filter.overloaded')}
    </Checkbox>
  );
}
