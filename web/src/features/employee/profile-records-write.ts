// HRM-08/FE-2A: form writes follow the same API used by the existing read-only profile tabs.
import { api } from '@/lib/api';

export type BankBody = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  defaultAccount: boolean;
};
export type DependentBody = {
  fullName: string;
  relationship: string;
  dateOfBirth: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
};
const base = (employeeId: string, section: string) => `/api/employees/${employeeId}/${section}`;

export async function saveBank(employeeId: string, body: BankBody, id?: string) {
  return api(base(employeeId, 'bank-accounts') + (id ? `/${id}` : ''), {
    method: id ? 'PUT' : 'POST', body,
  });
}
export async function removeBank(employeeId: string, id: string) {
  return api(base(employeeId, 'bank-accounts') + `/${id}`, { method: 'DELETE' });
}
export async function saveDependent(employeeId: string, body: DependentBody, id?: string) {
  return api(base(employeeId, 'dependents') + (id ? `/${id}` : ''), {
    method: id ? 'PUT' : 'POST', body,
  });
}
export async function removeDependent(employeeId: string, id: string) {
  return api(base(employeeId, 'dependents') + `/${id}`, { method: 'DELETE' });
}
