// The allocation actions of a project (allocate, edit, end early, delete), shared by the "Phân bổ nhân sự" button and
// the row menus. `null` when the viewer may not edit the project, or it is closed: render no action then.
import { createContext, useContext, type RefObject } from 'react';
import type { Allocation, EmployeeCard } from './api';

/** An allocation started from a Tìm người result: the person, the range and the percent asked for, and what to tell the user. */
export type AllocationPrefill = {
  employee: EmployeeCard;
  /** Cần phân bổ, or null when the search did not set it. */
  percent: number | null;
  startDate: string;
  endDate: string;
  /** "Từ Tìm người: React mức 4/5 · còn trống 70%." */
  note: string;
  /** Gets focus when the dialog closes and the button that opened it is gone (the person left the results). */
  fallbackFocus?: RefObject<HTMLElement | null>;
};

export type AllocationActions = {
  openAdd: (prefill?: AllocationPrefill) => void;
  openEdit: (allocation: Allocation) => void;
  openEnd: (allocation: Allocation) => void;
  openDelete: (allocation: Allocation) => void;
  /** The "Phân bổ nhân sự" button: it takes focus when a dialog closes and its opener is gone. */
  addButtonRef: RefObject<HTMLButtonElement | null>;
};

export const AllocationActionsContext = createContext<AllocationActions | null>(null);

export function useAllocationActions(): AllocationActions | null {
  return useContext(AllocationActionsContext);
}
