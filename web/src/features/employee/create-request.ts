// From the form to `POST /api/employees`, and the server's refusals back onto the form's fields.
import { ApiError } from '@/lib/api';
import type { EmployeeCreateRequest, EmployeeRef } from './api';
import { CREATE_FIELD_ORDER, digitsOf, type EmployeeCreateField, type EmployeeCreateValues } from './schemas';

const orNull = (value: string) => value.trim() || null;

/** Trimmed text, empty optional fields as null; "Dùng số CCCD làm mã số thuế" sends the CCCD as the MST. */
export function toCreateRequest(v: EmployeeCreateValues): EmployeeCreateRequest {
  const idNumber = digitsOf(v.idNumber);
  return {
    fullName: v.fullName.trim().replace(/\s+/g, ' '),
    personal: {
      dateOfBirth: v.dateOfBirth,
      gender: v.gender || null,
      personalEmail: orNull(v.personalEmail),
      phone: orNull(v.phone),
      address: orNull(v.address),
      emergencyContact: null,
    },
    identity: {
      idNumber: idNumber || null,
      idIssueDate: v.idIssueDate || null,
      idIssuePlace: orNull(v.idIssuePlace),
      taxCode: v.taxCodeFromId ? idNumber || null : digitsOf(v.taxCode) || null,
      socialInsuranceNumber: digitsOf(v.socialInsuranceNumber) || null,
    },
    job: {
      orgUnitId: v.orgUnitId || null,
      positionId: v.positionId || null,
      managerId: v.managerMode === 'ASSIGNED' ? v.managerId || null : null,
      hireDate: v.hireDate || null,
      status: v.status,
    },
  };
}

/** A message for the form: an i18n key and the values of its placeholders. */
export type ServerFieldError = { field: EmployeeCreateField; message: string; values?: Record<string, string> };

const E = 'employees.create.error.';
/** `errors[].field` of `validation.invalid` → the form field. */
const PATHS: Record<string, EmployeeCreateField> = {
  fullName: 'fullName',
  'personal.dateOfBirth': 'dateOfBirth',
  'personal.gender': 'gender',
  'personal.phone': 'phone',
  'personal.personalEmail': 'personalEmail',
  'personal.address': 'address',
  'identity.idNumber': 'idNumber',
  'identity.idIssueDate': 'idIssueDate',
  'identity.idIssuePlace': 'idIssuePlace',
  'identity.taxCode': 'taxCode',
  'identity.socialInsuranceNumber': 'socialInsuranceNumber',
  'job.orgUnitId': 'orgUnitId',
  'job.positionId': 'positionId',
  'job.managerId': 'managerId',
  'job.hireDate': 'hireDate',
  'job.status': 'status',
};
/** `field:code` → message; a code without its own message gets the field's generic one. */
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
};

/** The 409 and 400 codes that belong to one field. */
const CONFLICTS: Record<string, EmployeeCreateField> = {
  'employee.id_number_taken': 'idNumber',
  'employee.tax_code_taken': 'taxCode',
  'employee.social_insurance_number_taken': 'socialInsuranceNumber',
  'employee.org_unit_inactive': 'orgUnitId',
  'employee.org_unit_not_found': 'orgUnitId',
  'employee.position_inactive': 'positionId',
  'employee.position_not_found': 'positionId',
  'employee.manager_not_found': 'managerId',
  'employee.manager_invalid': 'managerId',
};

/**
 * The server's refusal as field errors, in form order; empty when it is about no field (a lost connection, no
 * permission). With "Dùng số CCCD làm mã số thuế" the MST field is hidden, so its errors go to the CCCD.
 */
export function serverFieldErrors(error: unknown, values: EmployeeCreateValues): ServerFieldError[] {
  if (!(error instanceof ApiError)) return [];
  const onScreen = (field: EmployeeCreateField): EmployeeCreateField => (field === 'taxCode' && values.taxCodeFromId ? 'idNumber' : field);
  let found: ServerFieldError[] = [];
  if (error.code === 'validation.invalid') {
    found = error.fieldErrors.flatMap(({ field, code }) => {
      const target = PATHS[field];
      if (!target) return [];
      return [{ field: onScreen(target), message: `${E}${MESSAGES[`${target}:${code}`] ?? 'invalid'}` }];
    });
  } else if (CONFLICTS[error.code]) {
    const field = CONFLICTS[error.code]!;
    const key = error.code.replace('employee.', '');
    // A number already held names its holder when the caller may see that Employee.
    const holder = key.endsWith('_taken') ? (error.details.employee as EmployeeRef | undefined) : undefined;
    const message = key.endsWith('_taken') && !holder ? `${E}${key}_other` : `${E}${key}`;
    found = [{ field: onScreen(field), message, values: holder ? { name: holder.fullName, code: holder.code } : undefined }];
  }
  // One message per field, the fields in form order.
  return CREATE_FIELD_ORDER.flatMap((field) => found.find((each) => each.field === field) ?? []);
}
