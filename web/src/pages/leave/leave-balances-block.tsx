// The balances of the year with the policies of the types, which add the rule lines.
import { useMemo } from 'react';
import { useLeaveBalances } from '@/features/leave/api';
import { LeaveBalanceSection } from '@/features/leave/components/leave-balance-section';
import { useLeaveTypes, type LeavePolicyValues } from '@/features/leave/policy-api';

export type LeaveBalancesBlockProps = { year: number };

export function LeaveBalancesBlock({ year }: LeaveBalancesBlockProps) {
  const balances = useLeaveBalances(year);
  const types = useLeaveTypes();
  const policies = useMemo(() => {
    const map = new Map<string, LeavePolicyValues>();
    for (const type of types.data?.items ?? []) if (type.policy) map.set(type.id, type.policy);
    return map;
  }, [types.data]);
  return <LeaveBalanceSection balances={balances.data} policies={policies} error={balances.isError} onRetry={() => void balances.refetch()} />;
}
