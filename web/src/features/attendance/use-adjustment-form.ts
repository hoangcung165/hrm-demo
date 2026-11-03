// The state of the Đơn bổ sung công form: the missing time(s), the reason, the checks before sending, and the send (or
// the edit of a returned request) with its toast. Server field errors land on their fields; a problem of the day
// (an open request, nothing missing…) shows above the form.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/api';
import { formatCompanyClock, formatDate } from '@/lib/format';
import { useResubmitAdjustment, useSendAdjustment, type AdjustmentDetail } from './adjustment-api';
import { isTime } from './manual-model';

export const ADJUSTMENT_REASON_MAX = 500;
type Field = 'in' | 'out' | 'reason';

export type UseAdjustmentFormProps = {
  date: string;
  /** The request being edited and sent again; absent for a new one. */
  editing?: AdjustmentDetail;
  onDone: (request: AdjustmentDetail) => void;
};

const clock = (value: string | null | undefined) => (value ? formatCompanyClock(value).slice(0, 5) : '');

export function useAdjustmentForm({ date, editing, onDone }: UseAdjustmentFormProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const send = useSendAdjustment();
  const resubmit = useResubmitAdjustment(editing?.id ?? '');
  const [values, setValues] = useState({ in: clock(editing?.in), out: clock(editing?.out), reason: editing?.reason ?? '' });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [problem, setProblem] = useState<string | null>(null);

  const set = (field: Field, value: string) => {
    setValues((now) => ({ ...now, [field]: value }));
    setErrors((now) => ({ ...now, [field]: undefined }));
    setProblem(null);
  };

  const submit = async (sides: { in: boolean; out: boolean }) => {
    const found: Partial<Record<Field, string>> = {};
    const given = { in: sides.in && values.in.trim() !== '', out: sides.out && values.out.trim() !== '' };
    if (!given.in && !given.out) found[sides.in ? 'in' : 'out'] = 'attendanceAdjustment.error.in.required';
    if (given.in && !isTime(values.in.trim())) found.in = 'attendanceManual.error.time';
    if (given.out && !isTime(values.out.trim())) found.out = 'attendanceManual.error.time';
    if (!values.reason.trim()) found.reason = 'attendanceAdjustment.error.reason.required';
    else if (values.reason.trim().length > ADJUSTMENT_REASON_MAX) found.reason = 'attendanceAdjustment.error.reason.too_long';
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const body = { reason: values.reason.trim(), ...(given.in ? { in: values.in.trim() } : {}), ...(given.out ? { out: values.out.trim() } : {}) };
    try {
      const result = editing ? await resubmit.mutateAsync(body) : await send.mutateAsync({ ...body, date });
      toast({ variant: 'success', message: t(editing ? 'attendanceAdjustment.toast.resent' : 'attendanceAdjustment.toast.sent', { day: formatDate(date) }) });
      onDone(result);
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors.length > 0) {
        const mapped: Partial<Record<Field, string>> = {};
        for (const field of error.fieldErrors) {
          if (field.field === 'date') setProblem(t(`attendanceAdjustment.problem.${field.code}`));
          else if (field.field === 'in' || field.field === 'out' || field.field === 'reason') mapped[field.field] = `attendanceAdjustment.error.${field.field}.${field.code}`;
        }
        setErrors(mapped);
        return;
      }
      setProblem(t(error instanceof ApiError && error.status === 409 ? 'attendanceAdjustment.error.changed' : 'attendanceAdjustment.error.sendFailed'));
    }
  };

  return { values, set, errors, problem, busy: send.isPending || resubmit.isPending, submit };
}

export type AdjustmentForm = ReturnType<typeof useAdjustmentForm>;
