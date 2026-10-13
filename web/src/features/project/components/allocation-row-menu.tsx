// The actions of one allocation in the members table: Sửa phân bổ, Kết thúc sớm (a running one), Xóa phân bổ (one
// that has not started; after the start the menu says why it is off and points to "Kết thúc sớm").
import { CalendarX, Ellipsis, Info, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Menu, type MenuItem } from '@/components/ui/menu';
import { useAllocationActions } from '../allocation-actions-context';
import type { Allocation } from '../api';

export function AllocationRowMenu({ allocation }: { allocation: Allocation }) {
  const { t } = useTranslation();
  const actions = useAllocationActions();
  if (!actions || allocation.status === 'ENDED') return null;
  const started = allocation.status === 'RUNNING';
  const items: MenuItem[] = [
    { id: 'edit', label: t('projects.allocate.editTitle'), icon: <Pencil aria-hidden="true" />, onSelect: () => actions.openEdit(allocation) },
    ...(started ? [{ id: 'end', label: t('projects.allocate.endEarly'), icon: <CalendarX aria-hidden="true" />, onSelect: () => actions.openEnd(allocation) }] : []),
    { id: 'delete', label: t('projects.allocate.deleteConfirm'), icon: <Trash2 aria-hidden="true" />, danger: true, separated: true, disabled: started, onSelect: () => actions.openDelete(allocation) },
  ];
  return (
    <Menu
      items={items}
      className="w-64"
      foot={
        started ? (
          <>
            <Info aria-hidden="true" />
            {t('projects.allocate.deleteStarted')}
          </>
        ) : undefined
      }
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={t('projects.allocate.more', { name: allocation.employee?.fullName ?? '' })} className="text-ink-muted">
          <Ellipsis aria-hidden="true" />
        </Button>
      }
    />
  );
}
