// The actions of the Ca làm việc page (add, edit, deactivate, reactivate), shared by the page header, the empty state
// and the rows.
import { createContext, useContext, type RefObject } from 'react';
import type { Shift } from './api';

/** `opener` is the row's menu button: it takes focus back when the dialog closes, while its row is still there. */
type RowAction = (shift: Shift, opener: HTMLElement | null) => void;

export type ShiftActions = {
  /** Opens "Thêm ca làm việc". */
  openAdd: () => void;
  /** Opens "Sửa ca: {tên}". */
  openEdit: RowAction;
  /** Opens the confirmation to turn the shift off. */
  askDeactivate: RowAction;
  /** Opens the confirmation to turn the shift on again. */
  askReactivate: RowAction;
  /** For the page-level add button: it takes focus when a dialog closes and its opener is gone. */
  addButtonRef: RefObject<HTMLButtonElement | null>;
};

export const ShiftActionsContext = createContext<ShiftActions | null>(null);

/** `null` when the Account lacks `SHIFT_EDIT`: render no action then. */
export function useShiftActions(): ShiftActions | null {
  return useContext(ShiftActionsContext);
}
