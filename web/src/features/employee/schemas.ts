// zod schema of "Thêm nhân viên", with the backend's rules (`EmployeeFieldRules`); messages are i18n keys. Numbers
// ignore spaces, as the backend does. `today` and whether the Employee may sit directly under the company come in.
import { addDays, addYears, format, isAfter, isBefore, parseISO } from 'date-fns';
import { z } from 'zod';

export const FULL_NAME_MAX = 150;
export const EMAIL_MAX = 254;
export const ADDRESS_MAX = 500;
export const ISSUE_PLACE_MAX = 150;
const HIRE_DAYS_AHEAD = 365;
const WORKING_AGE = 15;

const E = 'employees.create.error.';
export const digitsOf = (value: string) => value.replace(/\s+/g, '');
const phoneDigits = (value: string) => value.replace(/[\s.-]/g, '');
const PHONE = /^(0\d{9}|\+84\d{9})$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const text = z.string();

export const employeeCreateFields = {
  fullName: text,
  dateOfBirth: text,
  gender: z.enum(['', 'MALE', 'FEMALE']),
  phone: text,
  personalEmail: text,
  address: text,
  idNumber: text,
  idIssueDate: text,
  idIssuePlace: text,
  taxCodeFromId: z.boolean(),
  taxCode: text,
  socialInsuranceNumber: text,
  orgUnitId: text,
  positionId: text,
  managerMode: z.enum(['UNIT_HEAD', 'ASSIGNED']),
  managerId: text,
  hireDate: text,
  status: z.enum(['PROBATION', 'OFFICIAL']),
};

export type EmployeeCreateValues = z.infer<z.ZodObject<typeof employeeCreateFields>>;
export type EmployeeCreateField = keyof EmployeeCreateValues;

/** The fields in form order: the first error takes focus. */
export const CREATE_FIELD_ORDER: EmployeeCreateField[] = [
  'fullName', 'dateOfBirth', 'gender', 'phone', 'personalEmail', 'address', 'idNumber', 'idIssueDate', 'idIssuePlace', 'taxCode',
  'socialInsuranceNumber', 'status', 'orgUnitId', 'positionId', 'managerId', 'hireDate',
];

export const EMPTY_EMPLOYEE: EmployeeCreateValues = {
  fullName: '', dateOfBirth: '', gender: '', phone: '', personalEmail: '', address: '', idNumber: '', idIssueDate: '', idIssuePlace: '',
  taxCodeFromId: true, taxCode: '', socialInsuranceNumber: '', orgUnitId: '', positionId: '', managerMode: 'UNIT_HEAD', managerId: '',
  hireDate: '', status: 'PROBATION',
};

/** 10 digits, or 12 digits equal to the CCCD. */
function numberOrId(value: string, idNumber: string): string | null {
  const number = digitsOf(value);
  if (!number) return null;
  if (!/^(\d{10}|\d{12})$/.test(number)) return 'invalid';
  return number.length === 12 && /^\d{12}$/.test(idNumber) && number !== idNumber ? 'not_id_number' : null;
}

export function employeeCreateSchema({ today = new Date(), companyScope = true }: { today?: Date; companyScope?: boolean } = {}) {
  const iso = (date: Date) => format(date, 'yyyy-MM-dd');
  return z.object(employeeCreateFields).superRefine((v, ctx) => {
    const fail = (path: EmployeeCreateField, key: string) => ctx.addIssue({ code: 'custom', path: [path], message: `${E}${key}` });
    const name = v.fullName.trim().replace(/\s+/g, ' ');
    if (!name) fail('fullName', 'fullNameRequired');
    else if (name.length > FULL_NAME_MAX) fail('fullName', 'fullNameTooLong');

    const birth = v.dateOfBirth ? parseISO(v.dateOfBirth) : null;
    const hire = v.hireDate ? parseISO(v.hireDate) : null;
    if (!birth) fail('dateOfBirth', 'dateOfBirthRequired');
    else if (v.dateOfBirth <= '1900-01-01' || v.dateOfBirth >= iso(today)) fail('dateOfBirth', 'dateOfBirthRange');
    else if (hire && isAfter(addYears(birth, WORKING_AGE), hire)) fail('dateOfBirth', 'underAge');
    if (!v.gender) fail('gender', 'genderRequired');
    if (v.phone.trim() && !PHONE.test(phoneDigits(v.phone.trim()))) fail('phone', 'phoneInvalid');
    const email = v.personalEmail.trim();
    if (email && (email.length > EMAIL_MAX || !EMAIL.test(email))) fail('personalEmail', 'emailInvalid');
    if (v.address.trim().length > ADDRESS_MAX) fail('address', 'addressTooLong');

    const idNumber = digitsOf(v.idNumber);
    if (!idNumber) fail('idNumber', 'idNumberRequired');
    else if (!/^\d{12}$/.test(idNumber)) fail('idNumber', 'idNumberInvalid');
    if (v.idIssueDate && (v.idIssueDate > iso(today) || (birth && isBefore(parseISO(v.idIssueDate), birth)))) fail('idIssueDate', 'idIssueDateRange');
    if (v.idIssuePlace.trim().length > ISSUE_PLACE_MAX) fail('idIssuePlace', 'idIssuePlaceTooLong');
    if (!v.taxCodeFromId) {
      const taxCode = numberOrId(v.taxCode, idNumber);
      if (taxCode) fail('taxCode', taxCode === 'invalid' ? 'taxCodeInvalid' : 'taxCodeNotIdNumber');
    }
    const insurance = numberOrId(v.socialInsuranceNumber, idNumber);
    if (insurance) fail('socialInsuranceNumber', insurance === 'invalid' ? 'insuranceInvalid' : 'insuranceNotIdNumber');

    if (!v.orgUnitId && !companyScope) fail('orgUnitId', 'orgUnitRequired');
    if (!v.positionId) fail('positionId', 'positionRequired');
    if (v.managerMode === 'ASSIGNED' && !v.managerId) fail('managerId', 'managerRequired');
    if (!hire) fail('hireDate', 'hireDateRequired');
    else if (v.hireDate > iso(addDays(today, HIRE_DAYS_AHEAD))) fail('hireDate', 'hireDateRange');
  });
}
