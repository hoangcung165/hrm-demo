// From the form to `POST /api/employees`, and the server's refusals back onto the form's fields.
import type { EmployeeCreateRequest } from './api';
import { digitsOf, type EmployeeFormField, type EmployeeFormValues } from './schemas';
import { PERSONAL_PATHS, pathsOf, serverFieldErrors } from './server-errors';

const orNull = (value: string) => value.trim() || null;

/** Name and personal fields; the emergency contact is null when none of its fields is filled. */
export function personalPart(v: EmployeeFormValues): Pick<EmployeeCreateRequest, 'fullName' | 'personal'> {
  const contact = { name: orNull(v.contactName), relationship: orNull(v.contactRelationship), phone: orNull(v.contactPhone) };
  return {
    fullName: v.fullName.trim().replace(/\s+/g, ' '),
    personal: {
      dateOfBirth: v.dateOfBirth,
      gender: v.gender || null,
      personalEmail: orNull(v.personalEmail),
      phone: orNull(v.phone),
      address: orNull(v.address),
      emergencyContact: contact.name || contact.relationship || contact.phone ? contact : null,
    },
  };
}

/** The identity numbers without spaces; "Dùng số CCCD làm mã số thuế" sends the CCCD as the MST. */
export function identityPart(v: EmployeeFormValues): EmployeeCreateRequest['identity'] {
  const idNumber = digitsOf(v.idNumber);
  return {
    idNumber: idNumber || null,
    idIssueDate: v.idIssueDate || null,
    idIssuePlace: orNull(v.idIssuePlace),
    taxCode: v.taxCodeFromId ? idNumber || null : digitsOf(v.taxCode) || null,
    socialInsuranceNumber: digitsOf(v.socialInsuranceNumber) || null,
  };
}

/** Unit (null: directly under the company), position, manager (null: follow the unit head), start date, status. */
export function jobPart(v: EmployeeFormValues): EmployeeCreateRequest['job'] {
  return {
    orgUnitId: v.orgUnitId || null,
    positionId: v.positionId || null,
    managerId: v.managerMode === 'ASSIGNED' ? v.managerId || null : null,
    hireDate: v.hireDate || null,
    status: v.status,
  };
}

/** Trimmed text, empty optional fields as null. The create form has no emergency contact: it goes out as null. */
export const toCreateRequest = (v: EmployeeFormValues): EmployeeCreateRequest => ({ ...personalPart(v), identity: identityPart(v), job: jobPart(v) });

/** `POST /api/employees` field paths: the personal ones, then `identity.*` and `job.*`. */
export const CREATE_PATHS = {
  ...PERSONAL_PATHS,
  ...pathsOf(['idNumber', 'idIssueDate', 'idIssuePlace', 'taxCode', 'socialInsuranceNumber'], 'identity.'),
  ...pathsOf(['orgUnitId', 'positionId', 'managerId', 'hireDate', 'status'], 'job.'),
};

/** With "Dùng số CCCD làm mã số thuế" the MST field is hidden, so its errors go to the CCCD. */
export const mstOnScreen = (values: Pick<EmployeeFormValues, 'taxCodeFromId'>) => (field: EmployeeFormField): EmployeeFormField =>
  field === 'taxCode' && values.taxCodeFromId ? 'idNumber' : field;

/** The server's refusal of a create, under the form's fields. */
export const createFieldErrors = (error: unknown, values: EmployeeFormValues) => serverFieldErrors(error, { paths: CREATE_PATHS, onScreen: mstOnScreen(values) });
