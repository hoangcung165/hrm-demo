// HRM-08/FE-2B. The Employee's social insurance number stays on their Identity record.
import { api } from '@/lib/api';
import type { Insurance } from './profile-records-api';

export type InsuranceWrite = Pick<Insurance, 'participationDate' | 'healthRegistrationPlace' | 'healthInsuranceNumber'>;

export function saveEmployeeInsurance(employeeId: string, body: InsuranceWrite) {
  return api<Insurance>(`/api/employees/${employeeId}/insurance`, { method: 'PUT', body });
}
