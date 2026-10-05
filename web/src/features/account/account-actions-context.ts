// The actions of the Accounts page (add, edit), shared by the page header and the rows of the list.
import { createContext, useContext, type RefObject } from 'react';
import type { AccountRow } from './api';

export type AccountActions = {
  /** Opens "Thêm tài khoản". */
  openAdd: () => void;
  /** Opens "Sửa Tài khoản của {tên}". `opener` is the row's menu button: it takes focus back when the dialog closes. */
  openEdit: (account: AccountRow, opener: HTMLElement | null) => void;
  /** For the page-level add button: it takes focus when a dialog closes and its opener is gone. */
  addButtonRef: RefObject<HTMLButtonElement | null>;
};

export const AccountActionsContext = createContext<AccountActions | null>(null);

/** `null` when the Account lacks `ACCOUNT_EDIT`: render no action then. */
export function useAccountActions(): AccountActions | null {
  return useContext(AccountActionsContext);
}
