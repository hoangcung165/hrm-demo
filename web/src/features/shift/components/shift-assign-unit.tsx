// The unit of a Phân ca: required when the whole unit is chosen, an optional narrowing of the people list otherwise. The
// tree holds only the units of the Account's data scope, so a Line manager cannot choose a unit outside their own.
import { useTranslation } from 'react-i18next';
import { Field } from '@/components/ui/field';
import { TreeSelect } from '@/components/ui/tree-select';
import { useScopedUnits } from '../use-scoped-units';

export type ShiftAssignUnitProps = { value: string; onChange: (id: string) => void; required: boolean; error: string | null };

export function ShiftAssignUnit({ value, onChange, required, error }: ShiftAssignUnitProps) {
  const { t } = useTranslation();
  const { nodes } = useScopedUnits();
  return (
    <Field label={t('shiftAssign.target.unit')} required={required} helper={t(required ? 'shiftAssign.target.unitHelper' : 'shiftAssign.target.unitNarrow')} error={error ? t(error) : undefined}>
      {(control) => (
        <TreeSelect
          {...control}
          label={t('shiftAssign.target.unit')}
          nodes={nodes}
          value={value}
          onChange={onChange}
          allLabel={required ? undefined : t('shiftAssign.target.allScope')}
          placeholder={t('shiftAssign.target.pickUnit')}
          searchLabel={t('shiftCalendar.filter.findUnit')}
          noMatchText={t('shiftCalendar.filter.noUnit')}
        />
      )}
    </Field>
  );
}
