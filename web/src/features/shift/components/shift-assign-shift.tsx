// The Ca làm việc to assign: the shifts in use, with their hours. A shift that is turned off cannot be assigned.
import { useTranslation } from 'react-i18next';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import type { Shift } from '../api';

export type ShiftAssignShiftProps = { shifts: Shift[] | undefined; value: string; onChange: (id: string) => void; error: string | null };

export function ShiftAssignShift({ shifts, value, onChange, error }: ShiftAssignShiftProps) {
  const { t } = useTranslation();
  const active = (shifts ?? []).filter((shift) => shift.active);
  const options = active.map((shift) => ({ value: shift.id, label: `${shift.code} · ${shift.name} (${shift.startTime}–${shift.endTime})` }));
  return (
    <Field label={t('shiftAssign.shift.label')} required error={error ? t(error) : undefined} helper={shifts && active.length === 0 ? t('shiftAssign.shift.none') : undefined}>
      {(control) => <Select {...control} value={value} onChange={onChange} options={options} placeholder={t('shiftAssign.shift.placeholder')} disabled={options.length === 0} />}
    </Field>
  );
}
