// Library component "Drawer" (`hrm-drawer`): a 440px side panel from the right, under the header, with a head (caption,
// title, sub-line, close button), a scrolling body and an optional footer. Non-modal on desktop: the page behind stays
// usable, Esc closes, and focus returns to what opened it. Below 768px it is a full-screen sheet.
import { X } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from './button';

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  /** Small line above the title: what kind of detail this is ("Chi tiết ô heatmap"). */
  caption?: string;
  title: ReactNode;
  /** Line under the title. */
  subtitle?: ReactNode;
  /** Extra icon buttons, left of the close button. */
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Gets focus when the opener is gone by the time the drawer closes. */
  fallbackFocus?: () => HTMLElement | null;
  className?: string;
};

/** An open Radix dialog or menu is on top: Esc belongs to it, not to the drawer. */
const otherLayerOpen = () => document.querySelector('[role="dialog"][data-state="open"], [role="menu"][data-state="open"], [role="listbox"][data-state="open"]') !== null;

export function Drawer({ open, onClose, caption, title, subtitle, actions, children, footer, fallbackFocus, className }: DrawerProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const panel = useRef<HTMLElement>(null);
  const opener = useRef<Element | null>(null);
  const close = useRef(onClose);
  close.current = onClose;

  // Remember the opener, take focus into the panel (it announces its title), and give focus back on close.
  useLayoutEffect(() => {
    if (!open) return undefined;
    opener.current = document.activeElement;
    panel.current?.focus();
    return () => {
      const kept = opener.current instanceof HTMLElement && opener.current.isConnected && opener.current !== document.body;
      (kept ? (opener.current as HTMLElement) : fallbackFocus?.())?.focus();
    };
    // `fallbackFocus` is read at close time only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || otherLayerOpen()) return;
      event.preventDefault();
      close.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;
  return (
    <aside
      ref={panel}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      tabIndex={-1}
      className={cn(
        'fixed inset-0 z-40 flex flex-col bg-surface outline-none md:top-16 md:right-0 md:left-auto md:w-[440px] md:border-l md:border-line md:shadow-lg',
        className,
      )}
    >
      <header className="flex items-start gap-2 border-b border-line px-4 py-3 md:px-6">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {caption ? <span className="text-caption text-ink-muted">{caption}</span> : null}
          <h2 id={titleId} className="text-heading wrap-break-word">
            {title}
          </h2>
          {subtitle ? <div className="text-body text-ink-muted">{subtitle}</div> : null}
        </div>
        {actions}
        <Button variant="secondary" size="icon-sm" aria-label={t('drawer.close')} onClick={onClose}>
          <X aria-hidden="true" />
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">{children}</div>
      {footer ? <footer className="flex items-center justify-end gap-2 border-t border-line px-4 py-3 md:px-6">{footer}</footer> : null}
    </aside>
  );
}
