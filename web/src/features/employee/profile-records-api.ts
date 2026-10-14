// HRM-08 read-only profile records. The backend authorizes each request and masks sensitive fields.
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { EMPLOYEES_KEY } from './api';

export type BankAccount = {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  defaultAccount: boolean;
  masked: boolean;
};

export type Dependent = {
  id: string;
  fullName: string;
  relationship: string;
  dateOfBirth: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
};

export type Insurance = {
  socialInsuranceNumber: string | null;
  participationDate: string | null;
  healthRegistrationPlace: string | null;
  healthInsuranceNumber: string | null;
  masked: boolean;
};

export const profileRecordsKey = (employeeId: string, section: string) =>
  [...EMPLOYEES_KEY, 'profile', employeeId, section] as const;

export function useEmployeeBanks(employeeId: string) {
  return useQuery({
    queryKey: profileRecordsKey(employeeId, 'bank-accounts'),
    queryFn: () => api<BankAccount[]>(`/api/employees/${employeeId}/bank-accounts`),
  });
}

export function useEmployeeDependents(employeeId: string) {
  return useQuery({
    queryKey: profileRecordsKey(employeeId, 'dependents'),
    queryFn: () => api<Dependent[]>(`/api/employees/${employeeId}/dependents`),
  });
}

export function useEmployeeInsurance(employeeId: string) {
  return useQuery({
    queryKey: profileRecordsKey(employeeId, 'insurance'),
    queryFn: () => api<Insurance>(`/api/employees/${employeeId}/insurance`),
  });
}
