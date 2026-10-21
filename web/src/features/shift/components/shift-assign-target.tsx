// To whom a Phân ca applies: a whole unit (with the units below it), or chosen people.
import { useTranslation } from 'react-i18next';
import { FormGroup } from '@/components/ui/form-group';
import { Radio } from '@/components/ui/radio';
import type { ShiftCalendar } from '../calendar-api';
import type { AssignForm, TargetKind } from '../use-assign-form';
import { ShiftAssignPeople } from './shift-assign-people';
import { ShiftAssignUnit } from './shift-assign-unit';

export type ShiftAssignTargetProps = { form: AssignForm; calendar: ShiftCalendar | undefined };

const KINDS: TargetKind[] = ['UNIT', 'PEOPLE'];

export function ShiftAssignTarget({ form, calendar }: ShiftAssignTargetProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <FormGroup legend={t('shiftAssign.target.label')} className="border-t-0 pt-0">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {KINDS.map((kind) => (
            <Radio key={kind} name="shift-assign-target" value={kind} checked={form.kind === kind} onChange={() => form.setKind(kind)}>
              {t(`shiftAssign.target.${kind}`)}
            </Radio>
          ))}
        </div>
      </FormGroup>
      <ShiftAssignUnit value={form.orgUnitId} onChange={form.setOrgUnitId} required={form.kind === 'UNIT'} error={form.errors.unit} />
      {form.kind === 'PEOPLE' ? <ShiftAssignPeople calendar={calendar} failed={form.calendar.failed} value={form.people} onChange={form.setPeople} error={form.errors.people} /> : null}
    </div>
  );
}
