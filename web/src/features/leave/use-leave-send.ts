// The check behind the form and "Gửi đơn". Every change is checked (debounced, nothing saved): the days, the balance
// after, the problems and the approvers. "Gửi đơn" stays off until the check of what is on screen has no problem;
// a send refused by the API shows the problems it found. The missing fields show once the user tried to send.
import { useMemo, useState } from 'react';
import { ApiError } from '@/lib/api';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import type { LeaveRequestDetail } from './api';
import { useLeaveCheck, useSendLeaveRequest, type LeaveProblem, type LeaveRequestPayload } from './request-api';
import type { LeaveForm } from './use-leave-form';

export type LeaveSendResult = { ok: true; request: LeaveRequestDetail } | { ok: false; error: unknown };

export function useLeaveSend(form: LeaveForm, id?: string) {
  const key = JSON.stringify(form.payload);
  const debouncedKey = useDebouncedValue(key, 300);
  const checkPayload = useMemo(() => JSON.parse(debouncedKey) as LeaveRequestPayload | null, [debouncedKey]);
  const check = useLeaveCheck(checkPayload);
  const send = useSendLeaveRequest(id);
  const [tried, setTried] = useState(false);
  const [refused, setRefused] = useState<{ key: string; problems: LeaveProblem[] } | null>(null);

  /** The check answers what is on screen (not an earlier version of the form). */
  const current = form.payload !== null && debouncedKey === key && check.isSuccess && !check.isPlaceholderData;
  const result = form.payload ? check.data : undefined;
  // While the next check loads, the last answer's problems stay on screen (no flicker); sending waits for it.
  const problems = refused?.key === key ? refused.problems : (result?.problems ?? []);
  const missing = { type: !form.values.leaveTypeId, start: !form.values.startDate, end: !form.values.endDate };

  return {
    /** The latest answer of the check (it may lag the form while the next one loads). */
    result,
    checking: form.payload !== null && !current && !check.isError,
    checkFailed: check.isError,
    retryCheck: () => void check.refetch(),
    problems,
    has: (code: string) => problems.some((problem) => problem.code === code),
    /** Missing fields, once the user tried to send. */
    missing: tried ? missing : { type: false, start: false, end: false },
    sending: send.isPending,
    canSend: current && problems.length === 0 && !send.isPending,
    /** Sends what is on screen; null when it cannot go yet (the missing fields then show). */
    submit: async (): Promise<LeaveSendResult | null> => {
      setTried(true);
      if (!form.payload || !current || problems.length > 0) return null;
      try {
        return { ok: true, request: await send.mutateAsync(form.payload) };
      } catch (error) {
        const found = error instanceof ApiError ? (error.details.problems as LeaveProblem[] | undefined) : undefined;
        if (found?.length) {
          setRefused({ key, problems: found });
          return null;
        }
        return { ok: false, error };
      }
    },
  };
}

export type LeaveSend = ReturnType<typeof useLeaveSend>;
