// HRM-10/FE-3: pay is read only from the effective-dated Salary Profile, never directly from a contract.
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type SalaryProfileSegment = {
  from: string;
  to: string;
  baseSalary: number;
  insuranceSalary: number | null;
  allowancesJson: string;
  insured: boolean;
  taxMethod: string;
  sourceContractId: string | null;
  sourceAmendmentId: string | null;
  overrideReason: string | null;
};

export const salaryPeriodKey = (employeeId: string, from: string, to: string) =>
  ['salary-profile', employeeId, from, to] as const;

export function useSalaryPeriod(employeeId: string, from: string, to: string, enabled: boolean) {
  return useQuery({
    queryKey: salaryPeriodKey(employeeId, from, to),
    queryFn: () => api<SalaryProfileSegment[]>(
      `/api/employees/${employeeId}/salary-profile?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    ),
    enabled: enabled && Boolean(from && to && from <= to),
  });
}
