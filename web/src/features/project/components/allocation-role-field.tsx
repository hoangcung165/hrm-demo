// "Vai trò dự án" of the allocate dialog: the active items of the catalog, plus the one an edited allocation already
// has (an item deactivated since stays allowed while unchanged).
import { useTranslation } from 'react-i18next';
import { FormSelect } from '@/components/ui/form-select';
import type { ProjectRoleRef } from '../api';
import { useProjectRoles } from '../allocation-api';
import type { AllocationFormValues } from '../allocation-schemas';

export function AllocationRoleField({ current, className }: { current?: ProjectRoleRef | null; className?: string }) {
  const { t } = useTranslation();
  const roles = useProjectRoles();
  const items = roles.data ?? [];
  const listed = current && !items.some((role) => role.id === current.id) ? [current, ...items] : items;
  return (
    <FormSelect<AllocationFormValues>
      name="projectRoleId"
      label={t('projects.allocation.col.role')}
      required
      placeholder={t('projects.allocate.rolePlaceholder')}
      options={listed.map((role) => ({ value: role.id, label: role.name }))}
      className={className}
    />
  );
}
