// Library component "Toast": short confirmation (or failure) of an action the user just took.
// Shown by ToastProvider through `useToast()`; success closes itself after 5s, errors stay until closed.
// A success Toast has no role of its own: ToastProvider's container announces it politely. A danger Toast interrupts as an alert.
import { CircleCheck, TriangleAlert, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export const TOAST_DURATION_MS = 5000;

export type ToastProps = {
  variant: 'success' | 'danger';
  /** What happened, and to whom: "Đã lưu thông tin công ty". */
  message: string;
  detail?: string;
  /** Optional undo. */
  action?: { label: string; onClick: () => void };
  closeLabel: string;
  onClose: () => void;
  className?: string;
};

export function Toast({ variant, message, detail, action, closeLabel, onClose, className }: ToastProps) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    if (variant !== 'success') return;
    const timer = setTimeout(() => close.current(), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [variant]);

  const Icon = variant === 'success' ? CircleCheck : TriangleAlert;
  return (
    <div
      role={variant === 'danger' ? 'alert' : undefined}
      aria-atomic="true"
      className={cn('pointer-events-auto flex w-95 max-w-full items-start gap-3 rounded-md border border-line bg-surface px-4 py-3 shadow-lg', className)}
    >
      <Icon aria-hidden="true" className={cn('mt-px size-5 shrink-0 stroke-[1.5]', variant === 'success' ? 'text-success' : 'text-danger')} />
      <div className="min-w-0 flex-1">
        <div className="text-body-strong">{message}</div>
        {detail ? <div className="text-caption text-ink-muted">{detail}</div> : null}
        {action ? (
          <button type="button" onClick={action.onClick} className="mt-1 cursor-pointer rounded-sm font-medium text-link">
            {action.label}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="-my-1 -mr-2 grid size-8 shrink-0 cursor-pointer place-items-center rounded-sm text-ink-muted hover:bg-surface-muted max-md:-my-2.5 max-md:size-11"
      >
        <X aria-hidden="true" className="size-4 stroke-[1.5]" />
      </button>
    </div>
  );
}
