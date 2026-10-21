// What the dialog does: assign a shift, or clear the Phân ca that were assigned.
import { useTranslation } from 'react-i18next';
import { FormGroup } from '@/components/ui/form-group';
import { RadioCard } from '@/components/ui/radio-card';
import type { AssignMode } from '../use-assign-form';

export type ShiftAssignModeProps = { value: AssignMode; onChange: (mode: AssignMode) => void };

const MODES: AssignMode[] = ['ASSIGN', 'CLEAR'];

export function ShiftAssignMode({ value, onChange }: ShiftAssignModeProps) {
  const { t } = useTranslation();
  return (
    <FormGroup legend={t('shiftAssign.mode.label')} className="border-t-0 pt-0">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {MODES.map((mode) => (
          <RadioCard key={mode} name="shift-assign-mode" value={mode} checked={value === mode} onChange={() => onChange(mode)} title={t(`shiftAssign.mode.${mode}.title`)} caption={t(`shiftAssign.mode.${mode}.caption`)} />
        ))}
      </div>
    </FormGroup>
  );
}
