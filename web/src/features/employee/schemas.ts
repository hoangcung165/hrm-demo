// zod schemas of the employee forms: "Thêm nhân viên" and the three profile cards edited in place. They share one
// value shape (each form fills the fields it shows) and the rules of `field-rules.ts`; messages are i18n keys.
import { z } from 'zod';
import { checkIdentity, checkJob, checkPersonal, type Fail } from './field-rules';

export { ADDRESS_MAX, CONTACT_NAME_MAX, digitsOf, EMAIL_MAX, FULL_NAME_MAX, ISSUE_PLACE_MAX, RELATIONSHIP_MAX } from './field-rules';

const text = z.string();

export const employeeFormFields = {
  fullName: text,
  dateOfBirth: text,
  gender: z.enum(['', 'MALE', 'FEMALE']),
  phone: text,
  personalEmail: text,
  address: text,
  contactName: text,
  contactRelationship: text,
  contactPhone: text,
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

export type EmployeeFormValues = z.infer<z.ZodObject<typeof employeeFormFields>>;
export type EmployeeFormField = keyof EmployeeFormValues;

/** The fields in form order: the first error takes focus. */
export const FIELD_ORDER: EmployeeFormField[] = [
  'fullName', 'dateOfBirth', 'gender', 'phone', 'personalEmail', 'address', 'contactName', 'contactRelationship', 'contactPhone',
  'idNumber', 'idIssueDate', 'idIssuePlace', 'taxCode', 'socialInsuranceNumber', 'status', 'orgUnitId', 'positionId', 'managerId', 'hireDate',
];

export const EMPTY_EMPLOYEE: EmployeeFormValues = {
  fullName: '', dateOfBirth: '', gender: '', phone: '', personalEmail: '', address: '', contactName: '', contactRelationship: '', contactPhone: '',
  idNumber: '', idIssueDate: '', idIssuePlace: '', taxCodeFromId: true, taxCode: '', socialInsuranceNumber: '', orgUnitId: '', positionId: '',
  managerMode: 'UNIT_HEAD', managerId: '', hireDate: '', status: 'PROBATION',
};

const E = 'employees.create.error.';
type Check = (values: EmployeeFormValues, fail: Fail) => void;
const schemaOf = (check: Check) =>
  z.object(employeeFormFields).superRefine((values, ctx) => check(values, (field, key) => ctx.addIssue({ code: 'custom', path: [field], message: `${E}${key}` })));

/** The schema of any employee form: one value shape, the checks of the form's part. */
export type EmployeeFormSchema = ReturnType<typeof schemaOf>;

/** "Thêm nhân viên": every part; the age is checked on the date of birth. */
export function employeeCreateSchema({ today = new Date(), companyScope = true }: { today?: Date; companyScope?: boolean } = {}) {
  return schemaOf((v, fail) => {
    // The issue date is checked against the date of birth once, under the issue date.
    checkPersonal(v, fail, { today, hireDate: v.hireDate || undefined });
    checkIdentity(v, fail, { today, dateOfBirth: v.dateOfBirth || undefined });
    checkJob(v, fail, { today, companyScope });
  });
}

/** Card "Thông tin cá nhân", against the stored start date and CCCD issue date. */
export const personalEditSchema = (stored: { hireDate: string; idIssueDate: string | null }, today = new Date()) =>
  schemaOf((v, fail) => checkPersonal(v, fail, { today, ...stored }));

/** Card "Giấy tờ định danh", against the stored date of birth. */
export const identityEditSchema = (dateOfBirth: string, today = new Date()) => schemaOf((v, fail) => checkIdentity(v, fail, { today, dateOfBirth }));

/** Card "Vị trí công việc", against the stored date of birth (the age is checked on the start date). */
export const jobEditSchema = (dateOfBirth: string, companyScope: boolean, today = new Date()) =>
  schemaOf((v, fail) => checkJob(v, fail, { today, companyScope, dateOfBirth }));
