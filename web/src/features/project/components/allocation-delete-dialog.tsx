// "Xóa phân bổ": only for an allocation that has not started; after the start it can only end early.
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/api';
import { formatDateRange } from '@/lib/format';
import type { Allocation } from '../api';
import { useDeleteAllocation } from '../allocation-api';

export type AllocationDeleteDialogProps = { projectId: string; allocation: Allocation; onClose: () => void; fallbackFocus?: RefObject<HTMLElement | null> };

export function AllocationDeleteDialog({ projectId, allocation, onClose, fallbackFocus }: AllocationDeleteDialogProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const remove = useDeleteAllocation();
  const name = allocation.employee?.fullName ?? '';
  const confirm = async () => {
    try {
      await remove.mutateAsync({ projectId, allocationId: allocation.id });
      toast({ variant: 'success', message: t('projects.allocate.deleted', { name }) });
    } catch (failure) {
      const code = failure instanceof ApiError ? failure.code : '';
      toast({ variant: 'danger', message: t('projects.allocate.deleteFailed', { name }), detail: code === 'allocation.started' ? t('projects.allocate.error.started') : code === 'project.closed' ? t('projects.allocate.error.closed') : t('state.errorHint') });
    }
    onClose();
  };
  return (
    <ConfirmDialog
      open
      title={t('projects.allocate.deleteTitle', { name })}
      description={t('projects.allocate.deleteText', { percent: allocation.percent, range: formatDateRange(allocation.startDate, allocation.endDate) })}
      confirmLabel={t('projects.allocate.deleteConfirm')}
      pending={remove.isPending}
      onConfirm={() => void confirm()}
      onCancel={onClose}
      fallbackFocus={fallbackFocus}
    />
  );
}
