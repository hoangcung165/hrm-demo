// Trạng thái nhân viên as a Badge: Chính thức `success`, Thử việc `info`, Đã nghỉ việc `danger` with its icon.
import { UserX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import type { EmployeeStatus } from '../api';

export type EmployeeStatusBadgeProps = { status: EmployeeStatus };

const VARIANT = { OFFICIAL: 'success', PROBATION: 'info', INACTIVE: 'danger' } as const;

export function EmployeeStatusBadge({ status }: EmployeeStatusBadgeProps) {
  const { t } = useTranslation();
  return (
    <Badge variant={VARIANT[status]} className="whitespace-nowrap">
      {status === 'INACTIVE' ? <UserX aria-hidden="true" /> : null}
      {t(`employees.status.${status}`)}
    </Badge>
  );
}
