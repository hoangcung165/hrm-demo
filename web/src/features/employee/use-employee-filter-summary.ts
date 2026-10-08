// The filters in use, in words, for the no-match state: "Nhóm Web và đơn vị con · Kỹ sư phần mềm · Thử việc và
// chính thức". "Tất cả trạng thái" is no filter and is left out.
import { useTranslation } from 'react-i18next';
import { useOrgUnitOptions } from '@/features/org-unit/api';
import { usePositions } from './api';
import type { EmployeeFilters } from './use-employee-filters';

export function useEmployeeFilterSummary(filters: EmployeeFilters): string {
  const { t } = useTranslation();
  const units = useOrgUnitOptions();
  const positions = usePositions();
  const { orgUnitId, includeSubUnits, positionId } = filters.query;
  const unit = orgUnitId ? units.data?.find((each) => each.id === orgUnitId)?.name : undefined;
  const position = positionId ? positions.data?.find((each) => each.id === positionId)?.name : undefined;
  return [
    unit ? (includeSubUnits ? t('employees.filter.withSubUnits', { unit }) : unit) : null,
    position ?? null,
    filters.status === 'ALL' ? null : t(`employees.filter.statusOption.${filters.status}`),
  ]
    .filter(Boolean)
    .join(' · ');
}
