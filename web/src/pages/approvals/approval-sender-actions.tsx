// The sender's own actions on their request (artboard `#12 Luồng duyệt (trạng thái)`): "Hủy yêu cầu" while it waits
// or is returned (asked first), and for a returned profile update "Sửa và gửi lại", which continues at the same level.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/use-toast';
import { useCancelApprovalRequest, type ApprovalRequestDetail } from '@/features/approval/api';
import { errorMessage } from '@/features/auth/error-message';
import { useEmployee } from '@/features/employee/api';
import { useProfileUpdate } from '@/features/profile-update/api';
import { ProfileUpdateDialog } from '@/features/profile-update/components/profile-update-dialog';
import { valuesOf } from '@/features/profile-update/schema';

export type ApprovalSenderActionsProps = { request: ApprovalRequestDetail };

export function ApprovalSenderActions({ request }: ApprovalSenderActionsProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const cancel = useCancelApprovalRequest(request.id);
  const [asking, setAsking] = useState(false);
  const [editing, setEditing] = useState(false);
  const profileUpdate = request.type === 'PROFILE_UPDATE';
  const canResubmit = request.allowed.resubmit && profileUpdate;
  const profile = useEmployee(request.sender.id, canResubmit);
  const content = useProfileUpdate(request.id, canResubmit);
  if (!request.allowed.cancel && !canResubmit) return null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap justify-end gap-2">
        {request.allowed.cancel ? (
          <Button variant="secondary" className="max-md:h-11" onClick={() => setAsking(true)}>
            {t('profileUpdate.cancel.button')}
          </Button>
        ) : null}
        {canResubmit ? (
          <Button className="max-md:h-11" disabled={!profile.data || !content.data} onClick={() => setEditing(true)}>
            {t('profileUpdate.dialog.resubmitTitle')}
          </Button>
        ) : null}
      </div>
      <ConfirmDialog
        open={asking}
        title={t('profileUpdate.cancel.title', { type: t(`notifications.type.${request.type}`) })}
        description={t('profileUpdate.cancel.text')}
        confirmLabel={t('profileUpdate.cancel.confirm')}
        cancelLabel={t('profileUpdate.cancel.keep')}
        pending={cancel.isPending}
        onCancel={() => setAsking(false)}
        onConfirm={() =>
          cancel.mutate(undefined, {
            onSuccess: () => {
              setAsking(false);
              toast({ variant: 'success', message: t('profileUpdate.cancel.done') });
            },
            onError: (error) => {
              setAsking(false);
              toast({ variant: 'danger', message: t('approvals.detail.toast.failed'), detail: errorMessage(error, t) });
            },
          })
        }
      />
      {editing && profile.data && content.data ? (
        <ProfileUpdateDialog
          initial={valuesOf(profile.data, content.data.changes, content.data.note)}
          resubmit={{ id: request.id, level: request.level }}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </div>
  );
}
