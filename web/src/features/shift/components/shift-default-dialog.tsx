// "Ca mặc định": the shift the people of a unit work on their working days when nobody assigned them another one.
// Shows what the unit has now (its own, or the one of the unit above) and sets or clears its own.
import { useId, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { TreeSelect } from '@/components/ui/tree-select';
import { useShifts, type Shift } from '../api';
import { NO_DEFAULT, useDefaultShiftForm } from '../use-default-shift-form';

export type ShiftDefaultDialogProps = {
  /** The unit the calendar is filtered by, or `''`. */
  initialUnit: string;
  onClose: () => void;
  fallbackFocus?: RefObject<HTMLElement | null>;
};

const label = (shift: Shift) => `${shift.code} · ${shift.name} (${shift.startTime}–${shift.endTime})`;

export function ShiftDefaultDialog({ initialUnit, onClose, fallbackFocus }: ShiftDefaultDialogProps) {
  const { t } = useTranslation();
  const formId = useId();
  const shifts = useShifts();
  const form = useDefaultShiftForm({ initialUnit, onDone: onClose });
  const all = shifts.data ?? [];
  const code = (id: string) => all.find((shift) => shift.id === id)?.code ?? '';
  // Shifts in use, and the one the unit has now even when it was turned off since.
  const options = [{ value: NO_DEFAULT, label: t('shiftAssign.default.none') }, ...all.filter((shift) => shift.active || shift.id === form.current?.own).map((shift) => ({ value: shift.id, label: label(shift) }))];
  let now = '';
  if (form.unitId && form.current) {
    const { own, inherited } = form.current;
    if (own) now = t('shiftAssign.default.now.own', { shift: code(own) });
    else if (inherited) now = t('shiftAssign.default.now.inherited', { unit: inherited.unit.name, shift: code(inherited.shiftId) });
    else now = t('shiftAssign.default.now.none');
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t('shiftAssign.default.title')}
      description={t('shiftAssign.default.description')}
      busy={form.saving}
      fallbackFocus={fallbackFocus}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('dialog.cancel')}
          </Button>
          <Button type="submit" form={formId} disabled={form.saving || form.unchanged || form.failed}>
            {t('shiftAssign.default.save')}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void form.submit(code);
        }}
        className="flex flex-col gap-4"
      >
        {form.problem ? <Alert variant="danger" title={t(form.problem.key, form.problem.values)} /> : null}
        {form.failed ? <Alert variant="danger" title={t('shiftAssign.default.loadError')} /> : null}
        <Field label={t('shiftAssign.default.unit')} required error={form.unitError ? t(form.unitError) : undefined} helper={form.loading ? t('shiftAssign.default.loading') : now || undefined}>
          {(control) => (
            <TreeSelect
              {...control}
              label={t('shiftAssign.default.unit')}
              nodes={form.nodes}
              value={form.unitId}
              onChange={form.setUnitId}
              placeholder={t('shiftAssign.target.pickUnit')}
              searchLabel={t('shiftCalendar.filter.findUnit')}
              noMatchText={t('shiftCalendar.filter.noUnit')}
            />
          )}
        </Field>
        <Field label={t('shiftAssign.default.shift')} required>
          {(control) => <Select {...control} value={form.value} onChange={form.setValue} options={options} placeholder={t('shiftAssign.shift.placeholder')} disabled={!form.unitId || form.loading} />}
        </Field>
      </form>
    </Dialog>
  );
}
