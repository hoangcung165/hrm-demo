import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { profileRecordsKey } from './profile-records-api';

export type WorkHistoryKind = 'HIRE' | 'TRANSFER' | 'PROMOTION' | 'REWARD' | 'DISCIPLINE' | 'PROBATION_PASS' | 'PROBATION_FAIL' | 'PROBATION_EXTEND' | 'RESIGNATION';

/** The read-only milestone returned by WorkHistoryController. Dates are ISO calendar days. */
export type WorkHistoryItem = {
  sourceId: string | null;
  kind: WorkHistoryKind;
  decisionNumber: string | null;
  signedOn: string | null;
  effectiveOn: string;
  description: string;
  previousOrgUnitId: string | null;
  orgUnitId: string | null;
  previousPositionId: string | null;
  positionId: string | null;
  actorId: string | null;
};

export function useEmployeeWorkHistory(employeeId: string) {
  return useQuery({ queryKey: profileRecordsKey(employeeId, 'work-history'),
    queryFn: () => api<WorkHistoryItem[]>(`/api/employees/${employeeId}/work-history`) });
}
