// The sender's actions on their Đơn bổ sung công: "Hủy đơn" while it waits or is returned (asked first), and
// "Sửa và gửi lại" for a returned one, which opens the form in place.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/use-toast';
import { useCancelAdjustment, type AdjustmentDetail } from '@/features/attendance/adjustment-api';
import { errorMessage } from '@/features/auth/error-message';

export type AdjustmentRequestActionsProps = { request: AdjustmentDetail; onEdit: () => void };

export function AdjustmentRequestActions({ request, onEdit }: AdjustmentRequestActionsProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const cancel = useCancelAdjustment(request.id);
  const [asking, setAsking] = useState(false);
  if (!request.canCancel && !request.canEdit) return null;
  return (
    <div className="flex flex-wrap justify-end gap-2 max-md:grid max-md:grid-cols-2">
      {request.canCancel ? (
        <Button variant="secondary" className="text-danger max-md:h-11" onClick={() => setAsking(true)}>
          {t('attendanceAdjustment.cancel.button')}
        </Button>
      ) : null}
      {request.canEdit ? (
        <Button className="max-md:h-11" onClick={onEdit}>
          {t('attendanceAdjustment.edit')}
        </Button>
      ) : null}
      <ConfirmDialog
        open={asking}
        title={t('attendanceAdjustment.cancel.title')}
        description={t('attendanceAdjustment.cancel.text')}
        confirmLabel={t('attendanceAdjustment.cancel.confirm')}
        cancelLabel={t('attendanceAdjustment.cancel.keep')}
        pending={cancel.isPending}
        onCancel={() => setAsking(false)}
        onConfirm={() =>
          cancel.mutate(undefined, {
            onSuccess: () => {
              setAsking(false);
              toast({ variant: 'success', message: t('attendanceAdjustment.cancel.done') });
            },
            onError: (error) => {
              setAsking(false);
              toast({ variant: 'danger', message: t('attendanceAdjustment.error.sendFailed'), detail: errorMessage(error, t) });
            },
          })
        }
      />
    </div>
  );
}
