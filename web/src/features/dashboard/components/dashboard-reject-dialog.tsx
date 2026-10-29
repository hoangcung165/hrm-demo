// Từ chối from the block: a reason is required, as in the inbox; there is no reject without it and no undo.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';

export type DashboardRejectDialogProps = {
  /** The request being rejected: its type label and the sender; `null` keeps the dialog closed. */
  target: { typeLabel: string; name: string } | null;
  pending: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
};

export function DashboardRejectDialog({ target, pending, onConfirm, onCancel }: DashboardRejectDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [error, setError] = useState(false);
  useEffect(() => {
    if (target) {
      setReason('');
      setError(false);
    }
  }, [target]);
  const values = { type: target?.typeLabel ?? '', name: target?.name ?? '' };
  const submit = () => {
    if (!reason.trim()) {
      setError(true);
      return;
    }
    onConfirm(reason.trim());
  };
  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      title={t('dashboard.approvals.reject.title', values)}
      description={t('dashboard.approvals.reject.helper')}
      busy={pending}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {t('dialog.cancel')}
          </Button>
          <Button variant="danger" disabled={pending} onClick={submit}>
            {t('dashboard.approvals.reject.confirm')}
          </Button>
        </>
      }
    >
      <Field label={t('dashboard.approvals.reject.reason')} required error={error ? t('dashboard.approvals.reject.required') : undefined}>
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
