// The state of the "Ca mặc định" dialog: the unit, the shift picked for it (none until the user picks, so the dialog
// shows what the unit has now), and the save with its toast. A failure stays in the dialog as a sentence.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/api';
import { useDefaultShifts, useSetDefaultShift } from './assign-api';
import { assignProblem, type AssignProblem } from './assign-errors';
import { unitDefault } from './default-shift-model';
import { useScopedUnits } from './use-scoped-units';

/** The Select has no empty value: this one stands for "no default of its own". */
export const NO_DEFAULT = 'NONE';

export function useDefaultShiftForm({ initialUnit, onDone }: { initialUnit: string; onDone: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { nodes, units } = useScopedUnits();
  const defaults = useDefaultShifts();
  const save = useSetDefaultShift();
  const [unitId, setUnit] = useState(initialUnit);
  const [picked, setPicked] = useState<string | undefined>(undefined);
  const [attempted, setAttempted] = useState(false);
  const [problem, setProblem] = useState<AssignProblem | null>(null);

  const current = unitId && defaults.data ? unitDefault(unitId, units, defaults.data) : null;
  const value = picked ?? current?.own ?? NO_DEFAULT;
  const unchanged = value === (current?.own ?? NO_DEFAULT);

  const submit = async (shiftCode: (id: string) => string) => {
    setAttempted(true);
    if (!unitId || unchanged) return;
    setProblem(null);
    const unit = units.find((each) => each.id === unitId)?.name ?? '';
    try {
      await save.mutateAsync({ orgUnitId: unitId, shiftId: value === NO_DEFAULT ? null : value });
      toast({ variant: 'success', message: value === NO_DEFAULT ? t('shiftAssign.default.cleared', { unit }) : t('shiftAssign.default.saved', { shift: shiftCode(value), unit }) });
      onDone();
    } catch (error) {
      setProblem(error instanceof ApiError && error.status === 403 && error.code !== 'shift.inactive' ? { key: 'shiftAssign.default.denied' } : assignProblem(error));
    }
  };

  return {
    nodes,
    unitId,
    setUnitId: (id: string) => { setUnit(id); setPicked(undefined); setProblem(null); },
    unitError: attempted && !unitId ? 'shiftAssign.error.unitRequired' : null,
    current,
    loading: defaults.isPending,
    failed: defaults.isError,
    value,
    setValue: (next: string) => { setPicked(next); setProblem(null); },
    unchanged,
    problem,
    saving: save.isPending,
    submit,
  };
}

export type DefaultShiftForm = ReturnType<typeof useDefaultShiftForm>;
