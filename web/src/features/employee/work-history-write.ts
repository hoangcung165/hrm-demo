import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { profileRecordsKey } from './profile-records-api';
import type { WorkHistoryItem } from './profile-work-history-api';

export type DecisionKind = 'TRANSFER' | 'PROMOTION' | 'REWARD' | 'DISCIPLINE';
export type WorkDecisionWrite = {
  decisionNumber: string; kind: DecisionKind; signedOn: string; effectiveOn: string; description: string;
  orgUnitId: string | null; positionId: string | null; baseSalary: number | null;
  insuranceSalary: number | null; allowancesJson: string | null;
};
export type ProbationWrite = {
  sourceContractId: string; evaluatorId: string; startsOn: string; endsOn: string;
  outcome: 'PASS' | 'FAIL' | 'EXTEND'; notes: string;
};
export type FormalContractSuggestion = {
  sourceContractId: string; contractType: string; startsOn: string; endsOn: string | null;
  baseSalary: number; insuranceSalary: number | null; allowancesJson: string; insured: boolean; taxMethod: string;
};
export type ProbationEvaluation = ProbationWrite & {
  id: string; actorId: string; formalContractSuggestion: FormalContractSuggestion | null;
};

const path = (employeeId: string) => `/api/employees/${employeeId}`;
export const probationKey = (employeeId: string) => profileRecordsKey(employeeId, 'probation-evaluations');

export function useProbationEvaluations(employeeId: string, enabled: boolean) {
  return useQuery({ queryKey: probationKey(employeeId), enabled,
    queryFn: () => api<ProbationEvaluation[]>(`${path(employeeId)}/probation-evaluations`) });
}
export const createDecision = (employeeId: string, body: WorkDecisionWrite) =>
  api<WorkHistoryItem>(`${path(employeeId)}/work-history`, { method: 'POST', body });
export const createEvaluation = (employeeId: string, body: ProbationWrite) =>
  api<ProbationEvaluation>(`${path(employeeId)}/probation-evaluations`, { method: 'POST', body });
export const createResignation = (employeeId: string, body: { lastWorkingDay: string; reason: string }) =>
  api<WorkHistoryItem>(`${path(employeeId)}/resignation`, { method: 'POST', body });
