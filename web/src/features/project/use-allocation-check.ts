// The live "try allocation" of the allocate dialog: once person, percent and both dates make a complete allocation
// inside the project, and a moment after the last change, the backend answers with the Employee's load per period.
// Nothing is saved. While the answer is on its way (or the user is still typing) the state is `checking`.
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { useTryAllocation, type TryAllocationResult } from './allocation-api';
import { parsePercent, type AllocationFormValues } from './allocation-schemas';

export const CHECK_DELAY_MS = 300;

export type AllocationCheckState = { status: 'idle' } | { status: 'checking' } | { status: 'error' } | { status: 'ready'; result: TryAllocationResult };

/** `range`: the dates of the project. `allocationId`: the allocation being edited, which the check replaces. */
export function useAllocationCheck(projectId: string, allocationId: string | null, values: AllocationFormValues, range: { start: string; end: string }): AllocationCheckState {
  const { employeeId, startDate, endDate } = values;
  const percent = parsePercent(values.percent);
  const complete =
    Boolean(employeeId) && percent !== null && Boolean(startDate) && Boolean(endDate) && startDate <= endDate && startDate >= range.start && endDate <= range.end;
  const key = complete ? [employeeId, percent, startDate, endDate].join('|') : '';
  const settled = useDebouncedValue(key, CHECK_DELAY_MS);
  const [id, settledPercent, start, end] = settled.split('|');
  const query = useTryAllocation(
    projectId,
    settled ? { allocationId, employeeId: id!, percent: Number(settledPercent), startDate: start!, endDate: end! } : null,
  );
  if (!key) return { status: 'idle' };
  if (key !== settled || query.isPending) return { status: 'checking' };
  if (query.isError) return { status: 'error' };
  return { status: 'ready', result: query.data };
}
