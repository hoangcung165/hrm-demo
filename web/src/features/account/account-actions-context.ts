// The actions of the Accounts page (add, edit, set a temporary password, lock, unlock), shared by the page header
// and the rows of the list.
import { createContext, useContext, type RefObject } from 'react';
import type { AccountRow } from './api';

/** `opener` is the row's menu button: it takes focus back when the dialog closes or the action is done. */
type RowAction = (account: AccountRow, opener: HTMLElement | null) => void;

export type AccountActions = {
  /** Opens "Thêm tài khoản". */
  openAdd: () => void;
  /** Opens "Sửa Tài khoản của {tên}". */
  openEdit: RowAction;
  /** Opens "Đặt mật khẩu tạm cho {tên}". */
  openPassword: RowAction;
  /** Opens "Khóa Tài khoản của {tên}?". */
  openLock: RowAction;
  /** Unlocks at once and says so in a toast. */
  unlock: RowAction;
  /** An unlock is running: its menu item waits. */
  unlocking: boolean;
  /** For the page-level add button: it takes focus when a dialog closes and its opener is gone. */
  addButtonRef: RefObject<HTMLButtonElement | null>;
};

export const AccountActionsContext = createContext<AccountActions | null>(null);

/** `null` when the Account lacks `ACCOUNT_EDIT`: render no action then. */
export function useAccountActions(): AccountActions | null {
  return useContext(AccountActionsContext);
}
