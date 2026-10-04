// Confirm dialog (pattern P10): asks before an action that cannot be undone and names its object.
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './button';
import { Dialog } from './dialog';

export type ConfirmDialogProps = {
  open: boolean;
  /** The question with the object named: "Chấm dứt hợp đồng của Nguyễn Văn An?" */
  title: string;
  /** What will happen, and that it cannot be undone. */
  description: string;
  /** Repeats the verb of the title: "Chấm dứt hợp đồng". */
  confirmLabel: string;
  variant?: 'danger' | 'primary';
  /** True while the action runs: the confirm button keeps its label and is disabled. */
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Gets focus on close when the action removed the element that opened the dialog (e.g. its "remove" button). */
  fallbackFocus?: RefObject<HTMLElement | null>;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  variant = 'danger',
  pending = false,
  onConfirm,
  onCancel,
  fallbackFocus,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      title={title}
      description={description}
      fallbackFocus={fallbackFocus}
      busy={pending}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {t('dialog.cancel')}
          </Button>
          <Button variant={variant} disabled={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
