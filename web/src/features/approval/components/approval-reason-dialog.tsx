// The reason asked by Từ chối and Trả về để bổ sung: required, with what happens next named in the description.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import type { ApprovalRequestDetail } from '../api';
import { approverLabel } from '../approver-label';

export type ApprovalReasonDialogProps = {
  kind: 'reject' | 'return' | null;
  request: ApprovalRequestDetail;
  pending: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
};

export function ApprovalReasonDialog({ kind, request, pending, onConfirm, onCancel }: ApprovalReasonDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [error, setError] = useState(false);
  useEffect(() => {
    if (kind) {
      setReason('');
      setError(false);
    }
  }, [kind]);
  const shown = kind ?? 'reject';
  const step = request.steps[request.level - 1];
  const values = { name: request.sender.fullName, level: request.level, approver: step ? approverLabel(t, step.rule, step.role) : '' };
  const submit = () => {
    if (!reason.trim()) {
      setError(true);
      return;
    }
    onConfirm(reason.trim());
  };
  return (
    <Dialog
      open={kind !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      title={t(`approvals.detail.${shown}.title`, values)}
      description={t(`approvals.detail.${shown}.text`, values)}
      busy={pending}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {t('dialog.cancel')}
          </Button>
          <Button variant={shown === 'reject' ? 'danger' : 'primary'} disabled={pending} onClick={submit}>
            {t(`approvals.detail.${shown}.confirm`)}
          </Button>
        </>
      }
    >
      <Field label={t(`approvals.detail.${shown}.reason`)} required error={error ? t(`approvals.detail.${shown}.required`) : undefined}>
        {(control) => (
          <Textarea
            {...control}
            rows={3}
            maxLength={1000}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              if (error && event.target.value.trim()) setError(false);
            }}
          />
        )}
      </Field>
    </Dialog>
  );
}
