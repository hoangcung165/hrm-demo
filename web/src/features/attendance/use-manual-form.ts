// The state of the "Công thủ công" dialog: the kind, the times for TIMES, the note, the checks before sending, the
// save and the clear with their toasts. Server field errors land on their fields; anything else stays in the dialog.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/api';
import type { ManualKind } from './daily-api';
import { useClearManual, useSaveManual, type ManualEntryItem, type ManualRow, type ManualSaveResult } from './manual-api';
import { entriesIn, initialValues, isTime, requestOf, type ManualScope } from './manual-model';

export const MANUAL_NOTE_MAX = 500;
type FieldKey = 'kind' | 'in' | 'out' | 'note';
type Errors = Partial<Record<FieldKey, string>>;

export type UseManualFormProps = { scope: ManualScope; rows: ManualRow[]; orgUnitId: string; from: string; last: string; onDone: () => void };

export function useManualForm({ scope, rows, orgUnitId, from, last, onDone }: UseManualFormProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const save = useSaveManual();
  const clear = useClearManual();
  const existing: ManualEntryItem[] = entriesIn(scope, rows, from, last);
  const [values, setValues] = useState(() => initialValues(existing));
  const [errors, setErrors] = useState<Errors>({});
  const [problem, setProblem] = useState<string | null>(null);

  const set = (field: FieldKey, value: string) => {
    setValues((now) => ({ ...now, [field]: value }));
    setErrors((now) => ({ ...now, [field]: undefined }));
    setProblem(null);
  };

  const check = (): Errors => {
    const found: Errors = {};
    if (values.kind === 'TIMES') {
      if (!isTime(values.in)) found.in = 'attendanceManual.error.time';
      if (!isTime(values.out)) found.out = 'attendanceManual.error.time';
      else if (values.in === values.out) found.out = 'attendanceManual.error.out.same_as_in';
    }
    if (values.note.trim().length > MANUAL_NOTE_MAX) found.note = 'attendanceManual.error.note.too_long';
    return found;
  };

  const fail = (error: unknown) => {
    if (error instanceof ApiError && error.fieldErrors.length > 0) {
      const mapped: Errors = {};
      for (const field of error.fieldErrors) {
        if (field.field === 'in' || field.field === 'out' || field.field === 'note' || field.field === 'kind') mapped[field.field] = `attendanceManual.error.${field.field}.${field.code}`;
      }
      if (Object.keys(mapped).length > 0) return setErrors(mapped);
    }
    if (error instanceof ApiError && error.code === 'manual_attendance.out_of_scope') return setProblem(t('attendanceManual.error.outOfScope'));
    if (error instanceof ApiError && error.status === 403) return setProblem(t('attendanceManual.error.denied'));
    setProblem(t('attendanceManual.error.saveFailed'));
  };

  const report = (result: ManualSaveResult) => {
    const skippedDays = result.skipped.length;
    if (result.created + result.replaced === 0) {
      toast({ variant: 'success', message: t('attendanceManual.toast.unchanged') });
      return;
    }
    toast({
      variant: 'success',
      message: t('attendanceManual.toast.saved', { kind: t(`attendanceManual.kind.${values.kind}`), count: result.created + result.replaced }),
      detail: skippedDays > 0 ? t('attendanceManual.toast.skipped', { count: skippedDays }) : undefined,
    });
  };

  const submit = async () => {
    const found = check();
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const times = values.kind === 'TIMES' ? { in: values.in, out: values.out } : {};
    const note = values.note.trim();
    try {
      const result = await save.mutateAsync({ ...requestOf(scope, orgUnitId, from, last), kind: values.kind, ...times, ...(note ? { note } : {}) });
      report(result);
      onDone();
    } catch (error) {
      fail(error);
    }
  };

  const remove = async () => {
    try {
      const result = await clear.mutateAsync(requestOf(scope, orgUnitId, from, last));
      toast({ variant: 'success', message: t('attendanceManual.toast.cleared', { count: result.removed }) });
      onDone();
    } catch (error) {
      fail(error);
    }
  };

  return {
    values,
    setKind: (kind: ManualKind) => set('kind', kind),
    setIn: (value: string) => set('in', value),
    setOut: (value: string) => set('out', value),
    setNote: (value: string) => set('note', value),
    errors,
    problem,
    canClear: existing.length > 0,
    existingCount: existing.length,
    busy: save.isPending || clear.isPending,
    submit,
    remove,
  };
}

export type ManualForm = ReturnType<typeof useManualForm>;
