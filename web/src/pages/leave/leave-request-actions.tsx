// The sender's actions (artboard `#18 Chi tiết đơn nghỉ`): "Hủy đơn" while it waits or is returned, or once approved
// until it starts (asked first; an approved one gives its days back and tells the approver), and "Sửa đơn" for a
// request returned to them.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button, buttonVariants } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/use-toast';
import { errorMessage } from '@/features/auth/error-message';
import { useCancelLeaveRequest, type LeaveRequestDetail } from '@/features/leave/api';
import { formatDays } from '@/features/leave/leave-format';
import { formatDate } from '@/lib/format';

export type LeaveRequestActionsProps = { request: LeaveRequestDetail };

export function LeaveRequestActions({ request }: LeaveRequestActionsProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const cancel = useCancelLeaveRequest(request.id);
  const [asking, setAsking] = useState(false);
  if (!request.canCancel && !request.canEdit) return null;
  const approved = request.status === 'APPROVED';
  const approver = [...(request.approval?.steps ?? [])].reverse().find((step) => step.decidedBy)?.decidedBy?.fullName;
  const values = { date: formatDate(request.startDate), days: formatDays(request.days), type: request.leaveType.name, name: approver ?? '' };
  return (
    <div className="flex flex-wrap gap-2 md:justify-end">
      {request.canCancel ? (
        <Button variant="secondary" className="max-md:h-11 max-md:flex-1" onClick={() => setAsking(true)}>
          {t('leave.cancel.button')}
        </Button>
      ) : null}
      {request.canEdit ? (
        <Link to={`/leave/requests/${request.id}/edit`} className={buttonVariants({ className: 'max-md:h-11 max-md:flex-1' })}>
          {t('leave.edit.button')}
        </Link>
      ) : null}
      <ConfirmDialog
        open={asking}
        title={t('leave.cancel.title', { date: values.date })}
        description={t(approved ? (approver ? 'leave.cancel.textApproved' : 'leave.cancel.textApprovedSystem') : 'leave.cancel.textPending', values)}
        confirmLabel={t('leave.cancel.confirm')}
        cancelLabel={t('leave.cancel.keep')}
        variant="danger"
        pending={cancel.isPending}
        onCancel={() => setAsking(false)}
        onConfirm={() =>
          cancel.mutate(undefined, {
            onSuccess: () => {
              setAsking(false);
              toast({ variant: 'success', message: t(approved ? 'leave.cancel.doneApproved' : 'leave.cancel.done', values) });
            },
            onError: (error) => {
              setAsking(false);
              toast({ variant: 'danger', message: t('leave.cancel.failed'), detail: errorMessage(error, t) });
            },
          })
        }
      />
    </div>
  );
}
