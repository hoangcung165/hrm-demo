// HRM-10/FE-2: all edits go through contract / amendment documents. Salary profiles are immutable.
import { api } from '@/lib/api';
import { employeeContractsKey, type EmploymentContract } from './api';

export type ContractWrite = {
  contractNumber: string;
  contractType: string;
  signedOn: string;
  startsOn: string;
  endsOn: string | null;
  baseSalary: number;
  insuranceSalary: number | null;
  allowancesJson: string;
  insured: boolean | null;
  taxMethod: string | null;
  overrideReason: string | null;
};

export type AmendmentWrite = {
  amendmentNumber: string;
  signedOn: string;
  effectiveOn: string;
  description: string;
  baseSalary: number | null;
  insuranceSalary: number | null;
  allowancesJson: string | null;
  insured: boolean | null;
  taxMethod: string | null;
  overrideReason: string | null;
};

export type ContractAmendment = {
  id: string;
  contractId: string;
  amendmentNumber: string;
  signedOn: string;
  effectiveOn: string;
  description: string;
};

const endpoint = (employeeId: string) => `/api/employees/${employeeId}/contracts`;
export const contractAmendmentsKey = (employeeId: string, contractId: string) =>
  [...employeeContractsKey(employeeId), contractId, 'amendments'] as const;

export function createContract(employeeId: string, body: ContractWrite) {
  return api<EmploymentContract>(endpoint(employeeId), { method: 'POST', body });
}
export function reviseContract(employeeId: string, contractId: string, body: ContractWrite) {
  return api<EmploymentContract>(`${endpoint(employeeId)}/${contractId}`, { method: 'PUT', body });
}
export function deleteContract(employeeId: string, contractId: string) {
  return api<void>(`${endpoint(employeeId)}/${contractId}`, { method: 'DELETE' });
}
export function listContractAmendments(employeeId: string, contractId: string) {
  return api<ContractAmendment[]>(`${endpoint(employeeId)}/${contractId}/amendments`);
}
export function createAmendment(employeeId: string, contractId: string, body: AmendmentWrite) {
  return api<ContractAmendment>(`${endpoint(employeeId)}/${contractId}/amendments`, { method: 'POST', body });
}
