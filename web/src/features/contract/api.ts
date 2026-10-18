// HRM-10/FE-1: read-only contract history. DTO mirrors EmploymentContractResponse in the backend.
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type EmploymentContract = {
  id: string;
  employeeId: string;
  contractNumber: string;
  contractType: string;
  signedOn: string;
  startsOn: string;
  endsOn: string | null;
  baseSalary: number;
  insuranceSalary: number | null;
  allowancesJson: string;
  insured: boolean;
  taxMethod: string;
  probationStartsOn?: string | null;
  probationEndsOn?: string | null;
};

export const employeeContractsKey = (employeeId: string) => ['employee-contracts', employeeId] as const;

export function useEmployeeContracts(employeeId: string, enabled: boolean) {
  return useQuery({
    queryKey: employeeContractsKey(employeeId),
    queryFn: () => api<EmploymentContract[]>(`/api/employees/${employeeId}/contracts`),
    enabled,
  });
}
