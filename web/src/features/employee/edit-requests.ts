// The cards of a profile edited in place: the form values a profile starts from, and the field paths of each PUT.
// The bodies are the parts of the create request (`create-request.ts`).
import type { EmployeeProfile } from './api';
import type { EmployeeFormValues } from './schemas';
import { PERSONAL_PATHS, pathsOf } from './server-errors';

/**
 * The values of a profile for its edit forms. Masked numbers are never put in a field: the identity card can only be
 * edited with the full values, and without them the numbers start empty.
 */
export function profileToValues(profile: EmployeeProfile): EmployeeFormValues {
  const { personal, identity, job } = profile;
  const full = !identity.masked;
  const idNumber = full ? (identity.idNumber ?? '') : '';
  const taxCode = full ? (identity.taxCode ?? '') : '';
  return {
    fullName: profile.fullName,
    dateOfBirth: personal.dateOfBirth,
    gender: personal.gender,
    phone: personal.phone ?? '',
    personalEmail: personal.personalEmail ?? '',
    address: personal.address ?? '',
    contactName: personal.emergencyContact?.name ?? '',
    contactRelationship: personal.emergencyContact?.relationship ?? '',
    contactPhone: personal.emergencyContact?.phone ?? '',
    idNumber,
    idIssueDate: identity.idIssueDate ?? '',
    idIssuePlace: identity.idIssuePlace ?? '',
    // Ticked when the stored MST is the CCCD; a 10-digit MST, or none, shows in its own field.
    taxCodeFromId: Boolean(idNumber) && taxCode === idNumber,
    taxCode: taxCode === idNumber ? '' : taxCode,
    socialInsuranceNumber: full ? (identity.socialInsuranceNumber ?? '') : '',
    orgUnitId: job.orgUnit?.id ?? '',
    positionId: job.position.id,
    managerMode: job.managerSource,
    managerId: job.managerSource === 'ASSIGNED' ? (job.manager?.id ?? '') : '',
    hireDate: job.hireDate,
    // An Employee who left is not edited here; the job card is read-only for them.
    status: profile.status === 'OFFICIAL' ? 'OFFICIAL' : 'PROBATION',
  };
}

/** `PUT …/personal` answers with the create paths: `fullName`, `personal.*`. */
export const PERSONAL_EDIT_PATHS = PERSONAL_PATHS;
/** `PUT …/identity` and `PUT …/job` send their part alone: the paths have no prefix. */
export const IDENTITY_EDIT_PATHS = pathsOf(['idNumber', 'idIssueDate', 'idIssuePlace', 'taxCode', 'socialInsuranceNumber']);
export const JOB_EDIT_PATHS = pathsOf(['orgUnitId', 'positionId', 'managerId', 'hireDate', 'status']);
