// Library component "Dialog": modal for a confirmation or a short form. Focus trap, Esc and scrim come from Radix.
import { Dialog as RadixDialog } from 'radix-ui';
import { useRef, type ReactNode, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
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
  /** True while the dialog's action runs: `aria-busy`, and a polite status says so. */
  busy?: boolean;
  /** `wide` (640px) holds a form of five to eight fields in the two-column FormGrid. */
  size?: 'default' | 'wide';
  className?: string;
};

export function Dialog({ open, onOpenChange, title, description, children, footer, fallbackFocus, busy = false, size = 'default', className }: DialogProps) {
  const { t } = useTranslation();
  // The dialog is opened through `open`, without a Radix Trigger, so it remembers its opener itself.
  const opener = useRef<Element | null>(null);
  const returnFocus = (event: Event) => {
    event.preventDefault();
    // An opener that is gone (a menu item, a removed button) leaves `body` or a detached element behind.
    const kept = opener.current instanceof HTMLElement && opener.current.isConnected && opener.current !== document.body;
    const target = kept ? (opener.current as HTMLElement) : fallbackFocus?.current;
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
          // A Toast lies outside the dialog: a click on it, e.g. on its close button, does not close the dialog.
          // The check is on the Toast itself: by the time Radix reports the click, a closed Toast has left the page.
          onInteractOutside={(event) => {
            if (event.target instanceof Element && event.target.closest('[data-toast]')) event.preventDefault();
          }}
          aria-busy={busy || undefined}
          className={cn(
            // Never taller than the viewport: the body scrolls, the footer stays in view.
            'fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg bg-surface shadow-lg',
            size === 'wide' ? 'w-[640px]' : 'w-[440px]',
            className,
          )}
        >
          <div className={cn('flex min-h-0 flex-col overflow-y-auto px-6 pt-6 pb-4', children ? 'gap-4' : 'gap-2')}>
            <div className="flex flex-col gap-2">
              <RadixDialog.Title className="text-heading">{title}</RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="text-ink-muted">{description}</RadixDialog.Description>
              ) : null}
            </div>
            {children}
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-line px-6 py-4 max-md:[&_button]:h-11">{footer}</div>
          {/* Always mounted, so its text is announced when it appears. */}
          <span role="status" className="sr-only">
            {busy ? t('dialog.busy') : null}
          </span>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
