// MSW handlers for GET /api/employees/{id} ("## API contract" on issue #8) over the fixture Employees: the profile
// with its identity numbers in full, or masked as the backend masks them for a caller without
// EMPLOYEE_SENSITIVE_VIEW (every digit but the last four becomes "•"). Ids in `denied` answer 403.
import { http, HttpResponse } from 'msw';
import type { EmployeeIdentity, EmployeeListItem, EmployeeProfile } from '@/features/employee/api';
import { problem } from './auth-handlers';
import { EMPLOYEES } from './employee-fixtures';

const digits = (number: number) => String(number).padStart(5, '0');
const maskNumber = (value: string | null) => (value === null ? null : value.replace(/\d(?=\d{4})/g, '•'));

/** The full profile of a fixture Employee, numbered by its code (`7` for NV00007). */
export function employeeProfile(item: EmployeeListItem): EmployeeProfile {
  const number = Number(item.code.slice(2));
  const idNumber = `0011940${digits(number)}`;
  return {
    id: item.id,
    code: item.code,
    fullName: item.fullName,
    status: item.status,
    personal: {
      dateOfBirth: '1994-05-24',
      gender: / Thị /.test(item.fullName) ? 'FEMALE' : 'MALE',
      personalEmail: `nv${digits(number)}@mail.vn`,
      phone: '0912345678',
      address: 'Căn 1208, tòa B, 12 Nguyễn Hữu Thọ, Phường Tân Hưng, TP. Hồ Chí Minh',
      // The director has no emergency contact on file.
      emergencyContact: number === 1 ? null : { name: 'Nguyễn Văn Lực', relationship: 'Bố', phone: '0983112456' },
    },
    identity: {
      masked: false,
      idNumber,
      idIssueDate: '2021-04-10',
      idIssuePlace: 'Cục Cảnh sát quản lý hành chính về trật tự xã hội',
      taxCode: idNumber,
      socialInsuranceNumber: number === 1 ? null : `01940${digits(number)}`,
    },
    job: {
      orgUnit: item.orgUnit ? { id: item.orgUnit.id, code: item.orgUnit.code, name: item.orgUnit.name, active: item.orgUnit.active } : null,
      position: item.position!,
      manager: item.manager,
      // Võ Mạnh Cường's manager was chosen by HR.
      managerSource: number === 19 ? 'ASSIGNED' : 'UNIT_HEAD',
      hireDate: item.hireDate,
    },
    createdAt: '2026-09-01T03:00:00Z',
    updatedAt: '2026-09-02T03:00:00Z',
  };
}

/** The identity as a caller without EMPLOYEE_SENSITIVE_VIEW gets it. */
export const maskedIdentity = (identity: EmployeeIdentity): EmployeeIdentity => ({
  ...identity,
  masked: true,
  idNumber: maskNumber(identity.idNumber),
  taxCode: maskNumber(identity.taxCode),
  socialInsuranceNumber: maskNumber(identity.socialInsuranceNumber),
});

export type EmployeeProfileApiOptions = {
  /** As for a caller without EMPLOYEE_SENSITIVE_VIEW; `ownId` still gets its own numbers in full. */
  masked?: boolean;
  ownId?: string;
  /** Profiles outside the caller's data scope: 403. */
  denied?: string[];
};

export function employeeProfileApi({ masked = false, ownId, denied = [] }: EmployeeProfileApiOptions = {}) {
  const requests: string[] = [];
  const handler = http.get('*/api/employees/:id', ({ params }) => {
    const id = String(params.id);
    requests.push(id);
    if (denied.includes(id)) return problem(403, 'auth.forbidden');
    const item = EMPLOYEES.find((each) => each.id === id);
    if (!item) return problem(404, 'employee.not_found');
    const profile = employeeProfile(item);
    return HttpResponse.json(masked && id !== ownId ? { ...profile, identity: maskedIdentity(profile.identity) } : profile);
  });
  return { handler, requests };
}

export const employeeProfileFail = () => http.get('*/api/employees/:id', () => problem(500, 'error.unknown'));
