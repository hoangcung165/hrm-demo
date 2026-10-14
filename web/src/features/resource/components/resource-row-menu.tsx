// The row menu of the Bench and Sắp hết dự án lists: "Xem hồ sơ" (with EMPLOYEE_VIEW) and "Xem trên heatmap".
import { Gauge, MoreHorizontal, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Menu, type MenuItem } from '@/components/ui/menu';
import { useCurrentAccount } from '@/features/auth/account-context';
import type { EmployeeCard } from '@/features/project/api';

export type ResourceRowMenuProps = { employee: EmployeeCard; compact?: boolean };

export function ResourceRowMenu({ employee, compact = false }: ResourceRowMenuProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { permissions } = useCurrentAccount();
  const items: MenuItem[] = [
    ...(permissions.includes('EMPLOYEE_VIEW')
      ? [{ id: 'profile', label: t('resources.row.viewProfile'), icon: <UserRound />, onSelect: () => navigate(`/employees/${employee.id}`) }]
      : []),
    // The heatmap's search finds the person by code.
    { id: 'heatmap', label: t('resources.row.viewOnHeatmap'), icon: <Gauge />, onSelect: () => navigate(`/resources?${new URLSearchParams({ q: employee.code })}`) },
  ];
  return (
    <Menu
      items={items}
      trigger={
        <Button variant="secondary" size={compact ? 'icon' : 'icon-sm'} aria-label={t('resources.row.actions', { name: employee.fullName })}>
          <MoreHorizontal aria-hidden="true" />
        </Button>
      }
    />
  );
}
