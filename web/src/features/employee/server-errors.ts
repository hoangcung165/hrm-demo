// The server's refusals of an employee form, as messages under its fields: `validation.invalid` field paths (with
// the prefix of the request, e.g. `identity.` on create and none on the card's own PUT) and the codes that belong to
// one field (a number already held, an inactive unit or position, a manager that cannot be chosen, the status).
import { ApiError } from '@/lib/api';
import type { EmployeeRef } from './api';
import { FIELD_ORDER, type EmployeeFormField } from './schemas';

/** A message for the form: an i18n key and the values of its placeholders. */
export type ServerFieldError = { field: EmployeeFormField; message: string; values?: Record<string, string> };

const E = 'employees.create.error.';

/** `field:code` → message; a code without its own message gets the generic one. */
const MESSAGES: Record<string, string> = {
  'fullName:required': 'fullNameRequired',
  'fullName:too_long': 'fullNameTooLong',
  'dateOfBirth:required': 'dateOfBirthRequired',
  'dateOfBirth:out_of_range': 'dateOfBirthRange',
  'dateOfBirth:under_age': 'underAge',
  'gender:required': 'genderRequired',
  'phone:invalid': 'phoneInvalid',
  'personalEmail:invalid': 'emailInvalid',
  'address:too_long': 'addressTooLong',
  'contactName:too_long': 'contactNameTooLong',
  'contactRelationship:too_long': 'relationshipTooLong',
  'contactPhone:invalid': 'phoneInvalid',
  'idNumber:required': 'idNumberRequired',
  'idNumber:invalid': 'idNumberInvalid',
  'idIssueDate:out_of_range': 'idIssueDateRange',
  'idIssuePlace:too_long': 'idIssuePlaceTooLong',
  'taxCode:invalid': 'taxCodeInvalid',
  'taxCode:not_id_number': 'taxCodeNotIdNumber',
  'socialInsuranceNumber:invalid': 'insuranceInvalid',
  'socialInsuranceNumber:not_id_number': 'insuranceNotIdNumber',
  'positionId:required': 'positionRequired',
  'hireDate:required': 'hireDateRequired',
  'hireDate:out_of_range': 'hireDateRange',
  'hireDate:under_age': 'underAge',
  'status:required': 'statusRequired',
  'status:invalid': 'statusRequired',
};

/** The problem codes that belong to one field. */
const CONFLICTS: Record<string, EmployeeFormField> = {
  'employee.id_number_taken': 'idNumber',
  'employee.tax_code_taken': 'taxCode',
  'employee.social_insurance_number_taken': 'socialInsuranceNumber',
  'employee.org_unit_inactive': 'orgUnitId',
  'employee.org_unit_not_found': 'orgUnitId',
  'employee.position_inactive': 'positionId',
  'employee.position_not_found': 'positionId',
  'employee.manager_not_found': 'managerId',
  'employee.manager_invalid': 'managerId',
  'employee.status_change_not_allowed': 'status',
};

/** The paths of the personal fields, the same on create and on `PUT …/personal`. */
export const PERSONAL_PATHS: Record<string, EmployeeFormField> = {
  fullName: 'fullName',
  'personal.dateOfBirth': 'dateOfBirth',
  'personal.gender': 'gender',
  'personal.phone': 'phone',
  'personal.personalEmail': 'personalEmail',
  'personal.address': 'address',
  'personal.emergencyContact.name': 'contactName',
  'personal.emergencyContact.relationship': 'contactRelationship',
  'personal.emergencyContact.phone': 'contactPhone',
};

/** The paths of a part sent on its own (no prefix) or inside the create request (`identity.`, `job.`). */
export const pathsOf = (fields: EmployeeFormField[], prefix = ''): Record<string, EmployeeFormField> =>
  Object.fromEntries(fields.map((field) => [`${prefix}${field}`, field]));

export type ServerErrorOptions = {
  /** `errors[].field` → the form field. */
  paths: Record<string, EmployeeFormField>;
  /** Where a field that is not on screen shows its error, e.g. the MST that follows the CCCD. */
  onScreen?: (field: EmployeeFormField) => EmployeeFormField;
};

/** The server's refusal as field errors, in form order; empty when it is about no field (connection, permission). */
export function serverFieldErrors(error: unknown, { paths, onScreen = (field) => field }: ServerErrorOptions): ServerFieldError[] {
  if (!(error instanceof ApiError)) return [];
  let found: ServerFieldError[] = [];
  if (error.code === 'validation.invalid') {
    found = error.fieldErrors.flatMap(({ field, code }) => {
      const target = paths[field];
      return target ? [{ field: onScreen(target), message: `${E}${MESSAGES[`${target}:${code}`] ?? 'invalid'}` }] : [];
    });
  } else if (CONFLICTS[error.code]) {
    const key = error.code.replace('employee.', '');
    const taken = key.endsWith('_taken');
    // A number already held names its holder when the caller may see that Employee.
    const holder = taken ? (error.details.employee as EmployeeRef | undefined) : undefined;
    // `manager_invalid` says why: the Employee itself (SELF) or a loop of managers (CYCLE).
    const reason = key === 'manager_invalid' && typeof error.details.reason === 'string' ? `_${error.details.reason}` : '';
    const message = `${E}${key}${taken && !holder ? '_other' : reason}`;
    found = [{ field: onScreen(CONFLICTS[error.code]!), message, values: holder ? { name: holder.fullName, code: holder.code } : undefined }];
  }
  // One message per field, the fields in form order.
  return FIELD_ORDER.flatMap((field) => found.find((each) => each.field === field) ?? []);
}
