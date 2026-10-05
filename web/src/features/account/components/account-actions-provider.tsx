// Owns the dialogs of the Accounts page (add, edit) and offers their openers to the buttons below it.
import { useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { AccountActionsContext, type AccountActions } from '../account-actions-context';
import type { AccountFormTarget } from '../use-account-form';
import { AccountDialog } from './account-dialog';

export type AccountActionsProviderProps = {
  /** The Account has `ACCOUNT_EDIT`. */
  enabled: boolean;
  /** A save answered 403: the Account lost its permission meanwhile. */
  onDenied: () => void;
  children: ReactNode;
};

export function AccountActionsProvider({ enabled, onDenied, children }: AccountActionsProviderProps) {
  const [target, setTarget] = useState<AccountFormTarget | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  // The row menu button that opened the edit dialog. The dialog itself only sees the menu item, which is gone by the time it closes.
  const rowButton = useRef<HTMLElement | null>(null);
  // Where focus goes when the dialog closes and its opener is gone: the row's menu button while that row is still
  // on the page (it may have moved to another page of the list), else the add button.
  const fallbackFocus = useMemo<RefObject<HTMLElement | null>>(
    () => ({
      get current() {
        return rowButton.current?.isConnected ? rowButton.current : addButtonRef.current;
      },
      set current(_element) {},
    }),
    [],
  );
  const actions = useMemo<AccountActions | null>(
    () =>
      enabled
        ? {
            openAdd: () => {
              rowButton.current = null;
              setTarget({ mode: 'add' });
            },
            openEdit: (account, opener) => {
              rowButton.current = opener;
              setTarget({ mode: 'edit', account });
            },
            addButtonRef,
          }
        : null,
    [enabled],
  );
  const close = () => setTarget(null);
  return (
    <AccountActionsContext.Provider value={actions}>
      {children}
      {actions && target ? (
        <AccountDialog
          target={target}
          onClose={close}
          onSaved={close}
          onGone={(reason) => {
            close();
            if (reason === 'denied') onDenied();
          }}
          fallbackFocus={fallbackFocus}
        />
      ) : null}
    </AccountActionsContext.Provider>
  );
}
