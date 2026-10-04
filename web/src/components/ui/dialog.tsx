// Library component "Dialog": modal for a confirmation or a short form. Focus trap, Esc and scrim come from Radix.
import { Dialog as RadixDialog } from 'radix-ui';
import { useRef, type ReactNode, type RefObject } from 'react';
import { cn } from '@/lib/utils';

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Form fields or extra content, between the description and the footer. */
  children?: ReactNode;
  /** Buttons, right-aligned: secondary first, then the primary or danger action. */
  footer: ReactNode;
  /** On close, focus returns to the element that had it when the dialog opened. This one gets it when that element is gone. */
  fallbackFocus?: RefObject<HTMLElement | null>;
  className?: string;
};

export function Dialog({ open, onOpenChange, title, description, children, footer, fallbackFocus, className }: DialogProps) {
  // The dialog is opened through `open`, without a Radix Trigger, so it remembers its opener itself.
  const opener = useRef<Element | null>(null);
  const returnFocus = (event: Event) => {
    event.preventDefault();
    const target = opener.current instanceof HTMLElement && opener.current.isConnected ? opener.current : fallbackFocus?.current;
    target?.focus();
  };
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <RadixDialog.Content
          onOpenAutoFocus={() => {
            opener.current = document.activeElement;
          }}
          onCloseAutoFocus={returnFocus}
          className={cn(
            'fixed top-1/2 left-1/2 z-50 w-[440px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-surface shadow-lg',
            className,
          )}
        >
          <div className={cn('flex flex-col px-6 pt-6 pb-4', children ? 'gap-4' : 'gap-2')}>
            <div className="flex flex-col gap-2">
              <RadixDialog.Title className="text-heading">{title}</RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="text-ink-muted">{description}</RadixDialog.Description>
              ) : null}
            </div>
            {children}
          </div>
          <div className="flex justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
