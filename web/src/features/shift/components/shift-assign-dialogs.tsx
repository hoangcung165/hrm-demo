// The open dialog of the calendar, if any. Keyed by the way it was opened, so a new start gives a fresh form.
import type { AssignDialogs } from '../use-assign-dialogs';
import { ShiftAssignDialog } from './shift-assign-dialog';
import { ShiftDefaultDialog } from './shift-default-dialog';

export type ShiftAssignDialogsProps = { dialogs: AssignDialogs; unitId: string };

export function ShiftAssignDialogs({ dialogs, unitId }: ShiftAssignDialogsProps) {
  const { open } = dialogs;
  if (!dialogs.allowed || !open) return null;
  if (open.dialog === 'default') return <ShiftDefaultDialog initialUnit={unitId} onClose={dialogs.close} fallbackFocus={dialogs.toolbarButton} />;
  return <ShiftAssignDialog start={open.start} onClose={dialogs.close} onDenied={dialogs.onDenied} fallbackFocus={dialogs.toolbarButton} />;
}
