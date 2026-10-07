// The backend's field rules (`EmployeeFieldRules`) for the three parts of a profile, shared by "Thêm nhân viên"
// and the cards edited in place. Each check reports through `fail(field, key)`; keys are under
// `employees.create.error.`. Dates are ISO strings; numbers ignore spaces, as the backend does.
import { addDays, addYears, format, isAfter } from 'date-fns';
import type { EmployeeFormField, EmployeeFormValues } from './schemas';

export const FULL_NAME_MAX = 150;
export const EMAIL_MAX = 254;
export const ADDRESS_MAX = 500;
export const ISSUE_PLACE_MAX = 150;
export const CONTACT_NAME_MAX = 150;
export const RELATIONSHIP_MAX = 50;
const HIRE_DAYS_AHEAD = 365;
const WORKING_AGE = 15;

export type Fail = (field: EmployeeFormField, key: string) => void;

export const digitsOf = (value: string) => value.replace(/\s+/g, '');
const PHONE = /^(0\d{9}|\+84\d{9})$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const iso = (date: Date) => format(date, 'yyyy-MM-dd');
const phoneOk = (value: string) => !value.trim() || PHONE.test(value.trim().replace(/[\s.-]/g, ''));

/** At least 15 on the start date (Labour Code minimum working age). */
export const underAge = (dateOfBirth: string, hireDate: string) => isAfter(addYears(new Date(dateOfBirth), WORKING_AGE), new Date(hireDate));

/** 10 digits, or 12 digits equal to the CCCD; `null` when fine or empty. */
function numberOrId(value: string, idNumber: string): 'invalid' | 'not_id_number' | null {
  const number = digitsOf(value);
  if (!number) return null;
  if (!/^(\d{10}|\d{12})$/.test(number)) return 'invalid';
  return number.length === 12 && /^\d{12}$/.test(idNumber) && number !== idNumber ? 'not_id_number' : null;
}

type Personal = Pick<EmployeeFormValues, 'fullName' | 'dateOfBirth' | 'gender' | 'phone' | 'personalEmail' | 'address' | 'contactName' | 'contactRelationship' | 'contactPhone'>;

/**
 * Name, date of birth, gender, contact details, emergency contact. `hireDate`: the start date the age is checked
 * against; `idIssueDate`: the stored CCCD issue date, which the date of birth may not come after.
 */
export function checkPersonal(v: Personal, fail: Fail, { today, hireDate, idIssueDate }: { today: Date; hireDate?: string; idIssueDate?: string | null }) {
  const name = v.fullName.trim().replace(/\s+/g, ' ');
  if (!name) fail('fullName', 'fullNameRequired');
  else if (name.length > FULL_NAME_MAX) fail('fullName', 'fullNameTooLong');
  if (!v.dateOfBirth) fail('dateOfBirth', 'dateOfBirthRequired');
  else if (v.dateOfBirth <= '1900-01-01' || v.dateOfBirth >= iso(today) || (idIssueDate && v.dateOfBirth > idIssueDate)) fail('dateOfBirth', 'dateOfBirthRange');
  else if (hireDate && underAge(v.dateOfBirth, hireDate)) fail('dateOfBirth', 'underAge');
  if (!v.gender) fail('gender', 'genderRequired');
  if (!phoneOk(v.phone)) fail('phone', 'phoneInvalid');
  const email = v.personalEmail.trim();
  if (email && (email.length > EMAIL_MAX || !EMAIL.test(email))) fail('personalEmail', 'emailInvalid');
  if (v.address.trim().length > ADDRESS_MAX) fail('address', 'addressTooLong');
  if (v.contactName.trim().length > CONTACT_NAME_MAX) fail('contactName', 'contactNameTooLong');
  if (v.contactRelationship.trim().length > RELATIONSHIP_MAX) fail('contactRelationship', 'relationshipTooLong');
  if (!phoneOk(v.contactPhone)) fail('contactPhone', 'phoneInvalid');
}

type Identity = Pick<EmployeeFormValues, 'idNumber' | 'idIssueDate' | 'idIssuePlace' | 'taxCodeFromId' | 'taxCode' | 'socialInsuranceNumber'>;

/** CCCD (required, 12 digits), its issue date and place, MST and số BHXH. `dateOfBirth`: the issue date's lower bound. */
export function checkIdentity(v: Identity, fail: Fail, { today, dateOfBirth }: { today: Date; dateOfBirth?: string }) {
  const idNumber = digitsOf(v.idNumber);
  if (!idNumber) fail('idNumber', 'idNumberRequired');
  else if (!/^\d{12}$/.test(idNumber)) fail('idNumber', 'idNumberInvalid');
  if (v.idIssueDate && (v.idIssueDate > iso(today) || (dateOfBirth && v.idIssueDate < dateOfBirth))) fail('idIssueDate', 'idIssueDateRange');
  if (v.idIssuePlace.trim().length > ISSUE_PLACE_MAX) fail('idIssuePlace', 'idIssuePlaceTooLong');
  if (!v.taxCodeFromId) {
    const taxCode = numberOrId(v.taxCode, idNumber);
    if (taxCode) fail('taxCode', taxCode === 'invalid' ? 'taxCodeInvalid' : 'taxCodeNotIdNumber');
  }
  const insurance = numberOrId(v.socialInsuranceNumber, idNumber);
  if (insurance) fail('socialInsuranceNumber', insurance === 'invalid' ? 'insuranceInvalid' : 'insuranceNotIdNumber');
}

type Job = Pick<EmployeeFormValues, 'orgUnitId' | 'positionId' | 'managerMode' | 'managerId' | 'hireDate'>;

/**
 * Unit, position, manager, start date. `companyScope`: the Employee may sit directly under the company.
 * `dateOfBirth`: on edit, the stored one; the start date must leave the Employee at least 15.
 */
export function checkJob(v: Job, fail: Fail, { today, companyScope, dateOfBirth }: { today: Date; companyScope: boolean; dateOfBirth?: string }) {
  if (!v.orgUnitId && !companyScope) fail('orgUnitId', 'orgUnitRequired');
  if (!v.positionId) fail('positionId', 'positionRequired');
  if (v.managerMode === 'ASSIGNED' && !v.managerId) fail('managerId', 'managerRequired');
  if (!v.hireDate) fail('hireDate', 'hireDateRequired');
  else if (v.hireDate > iso(addDays(today, HIRE_DAYS_AHEAD))) fail('hireDate', 'hireDateRange');
  else if (dateOfBirth && underAge(dateOfBirth, v.hireDate)) fail('hireDate', 'underAge');
}
