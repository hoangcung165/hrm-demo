// "Phân ca": assign one Ca làm việc to people or a whole unit for a range of days, or clear what was assigned. It says
// beforehand how many Phân ca it adds and replaces, and stays open when the server refuses, with the cause in it.
import { useId, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useShifts } from '../api';
import { useAssignForm, type AssignStart } from '../use-assign-form';
import { ShiftAssignMode } from './shift-assign-mode';
import { ShiftAssignPeriod } from './shift-assign-period';
import { ShiftAssignPreview } from './shift-assign-preview';
import { ShiftAssignShift } from './shift-assign-shift';
import { ShiftAssignTarget } from './shift-assign-target';

export type ShiftAssignDialogProps = {
  start: AssignStart;
  onClose: () => void;
  /** The Account lost `SHIFT_ASSIGN` meanwhile. */
  onDenied: () => void;
  /** Takes focus when the button that opened the dialog is gone. */
  fallbackFocus?: RefObject<HTMLElement | null>;
};

export function ShiftAssignDialog({ start, onClose, onDenied, fallbackFocus }: ShiftAssignDialogProps) {
  const { t } = useTranslation();
  const formId = useId();
  const shifts = useShifts();
  const form = useAssignForm({ start, shiftCode: (id) => shifts.data?.find((shift) => shift.id === id)?.code ?? '', onDone: onClose, onDenied });
  const clear = form.mode === 'CLEAR';
  const removed = clear && form.preview && 'removed' in form.preview ? form.preview.removed : null;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t('shiftAssign.title')}
      description={t('shiftAssign.description')}
      size="wide"
      busy={form.saving}
      fallbackFocus={fallbackFocus}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('dialog.cancel')}
          </Button>
          <Button type="submit" form={formId} variant={clear ? 'danger' : 'primary'} disabled={form.saving || removed === 0}>
            {clear ? t('shiftAssign.submit.clear', { count: removed ?? 0 }) : t('shiftAssign.submit.assign')}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void form.submit();
        }}
        className="flex flex-col gap-4"
      >
        <ShiftAssignMode value={form.mode} onChange={form.setMode} />
        {form.problem ? <Alert variant="danger" title={t(form.problem.key, form.problem.values)} /> : null}
        <ShiftAssignTarget form={form} calendar={form.calendar.data} />
        {clear ? null : <ShiftAssignShift shifts={shifts.data} value={form.shiftId} onChange={form.setShiftId} error={form.errors.shift} />}
        <ShiftAssignPeriod range={form.range} onRange={form.setRange} rangeError={form.errors.range} weekdays={clear ? null : form.weekdays} onWeekdays={form.setWeekdays} />
        <ShiftAssignPreview mode={form.mode} preview={form.preview} loading={form.calendar.loading} failed={form.calendar.failed} />
      </form>
    </Dialog>
  );
}
