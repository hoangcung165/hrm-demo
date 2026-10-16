// HRM-10/FE-2: writes are document-sourced; salary snapshots are never edited directly.
import { api } from '@/lib/api';
import type { EmploymentContract } from './api';

export type ContractWrite = {
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

const url = (employeeId: string) => `/api/employees/${employeeId}/contracts`;
export async function saveContract(employeeId: string, body: ContractWrite, id?: string): Promise<EmploymentContract> {
  return api(url(employeeId) + (id ? `/${id}` : ''), { method: id ? 'PUT' : 'POST', body });
}
export async function deleteContract(employeeId: string, id: string): Promise<void> {
  return api(url(employeeId) + `/${id}`, { method: 'DELETE' });
}
export async function listAmendments(employeeId: string, contractId: string): Promise<ContractAmendment[]> {
  return api(url(employeeId) + `/${contractId}/amendments`);
}
export async function saveAmendment(employeeId: string, contractId: string, body: AmendmentWrite): Promise<ContractAmendment> {
  return api(url(employeeId) + `/${contractId}/amendments`, { method: 'POST', body });
}
