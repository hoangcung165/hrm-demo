// Owns the dialogs of the Accounts page (add, edit, set a temporary password, lock) and offers their openers,
// and the unlock action, to the buttons below it.
import { useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AccountActionsContext, type AccountActions } from '../account-actions-context';
import type { AccountRow } from '../api';
import type { AccountFormTarget } from '../use-account-form';
import { useAccountStatus } from '../use-account-status';
import { AccountDialog } from './account-dialog';
import { AccountPasswordDialog } from './account-password-dialog';

export type AccountActionsProviderProps = {
  /** The Account has `ACCOUNT_EDIT`. */
  enabled: boolean;
  /** An action answered 403: the Account lost its permission meanwhile. */
  onDenied: () => void;
  children: ReactNode;
};

/** The open dialog. */
type Open = { kind: 'form'; target: AccountFormTarget } | { kind: 'password' | 'lock'; account: AccountRow };

export function AccountActionsProvider({ enabled, onDenied, children }: AccountActionsProviderProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<Open | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  // The row menu button that started the action. A dialog only sees the menu item, which is gone by the time it closes.
  const rowButton = useRef<HTMLElement | null>(null);
  // Where focus goes when the opener is gone: the row's menu button while that row is still on the page (after an
  // edit or a status change it may have left it), else the add button.
  const fallbackFocus = useMemo<RefObject<HTMLElement | null>>(
    () => ({
      get current() {
        return rowButton.current?.isConnected ? rowButton.current : addButtonRef.current;
      },
      set current(_element) {},
    }),
    [],
  );
  const close = () => setOpen(null);
  const onGone = (reason: 'denied' | 'notFound') => {
    close();
    if (reason === 'denied') onDenied();
  };
  const status = useAccountStatus({ onGone });
  const from = (opener: HTMLElement | null, next: Open) => {
    rowButton.current = opener;
    setOpen(next);
  };
  const actions: AccountActions | null = enabled
    ? {
        openAdd: () => from(null, { kind: 'form', target: { mode: 'add' } }),
        openEdit: (account, opener) => from(opener, { kind: 'form', target: { mode: 'edit', account } }),
        openPassword: (account, opener) => from(opener, { kind: 'password', account }),
        openLock: (account, opener) => from(opener, { kind: 'lock', account }),
        unlock: (account, opener) => {
          rowButton.current = opener;
          // No dialog returns focus here. Once the list has been redrawn: if the row left it (a status filter) and
          // took the focus along, the fallback gets it; focus the user has moved elsewhere is left alone.
          void status.unlock(account).then(() =>
            requestAnimationFrame(() => {
              if (document.activeElement === document.body || !document.activeElement?.isConnected) fallbackFocus.current?.focus();
            }),
          );
        },
        unlocking: status.unlocking,
        addButtonRef,
      }
    : null;

  const locking = open?.kind === 'lock' ? open.account : null;
  return (
    <AccountActionsContext.Provider value={actions}>
      {children}
      {actions && open?.kind === 'form' ? <AccountDialog target={open.target} onClose={close} onSaved={close} onGone={onGone} fallbackFocus={fallbackFocus} /> : null}
      {actions && open?.kind === 'password' ? (
        <AccountPasswordDialog account={open.account} saving={status.settingPassword} onSubmit={(password) => status.setPassword(open.account, password)} onClose={close} fallbackFocus={fallbackFocus} />
      ) : null}
      {actions && locking ? (
        <ConfirmDialog
          open
          title={t('accounts.lock.title', { name: locking.fullName })}
          description={t('accounts.lock.text', { name: locking.fullName })}
          confirmLabel={t('accounts.lock.submit')}
          pending={status.locking}
          // Closes either way: a failure is said in a toast, and asking again would not change its cause.
          onConfirm={() => void status.lock(locking).then(close)}
          onCancel={close}
          fallbackFocus={fallbackFocus}
        />
      ) : null}
    </AccountActionsContext.Provider>
  );
}
