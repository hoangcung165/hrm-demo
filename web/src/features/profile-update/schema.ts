// The "Đề nghị cập nhật hồ sơ" form: the contact fields as the Employee wants them, checked with the profile's rules
// (the backend checks again); messages are i18n keys under `employees.create.error.`.
import { z } from 'zod';
import type { EmployeeProfile } from '@/features/employee/api';
import { formatPhone } from '@/lib/format';
import type { ProfileUpdateChange, ProfileUpdateInput } from './api';

const PHONE = /^(0\d{9}|\+84\d{9})$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneOk = (value: string) => !value.trim() || PHONE.test(value.trim().replace(/[\s.-]/g, ''));
const E = 'employees.create.error.';
export const NOTE_MAX = 500;

export const profileUpdateSchema = z
  .object({
    personalEmail: z.string(),
    phone: z.string(),
    address: z.string(),
    contactName: z.string(),
    contactRelationship: z.string(),
    contactPhone: z.string(),
    note: z.string(),
  })
  .superRefine((v, ctx) => {
    const fail = (path: string, key: string) => ctx.addIssue({ code: 'custom', path: [path], message: `${E}${key}` });
    const email = v.personalEmail.trim();
    if (email && (email.length > 254 || !EMAIL.test(email))) fail('personalEmail', 'emailInvalid');
    if (!phoneOk(v.phone)) fail('phone', 'phoneInvalid');
    if (v.address.trim().length > 500) fail('address', 'addressTooLong');
    if (v.contactName.trim().length > 150) fail('contactName', 'contactNameTooLong');
    if (v.contactRelationship.trim().length > 50) fail('contactRelationship', 'relationshipTooLong');
    if (!phoneOk(v.contactPhone)) fail('contactPhone', 'phoneInvalid');
  });

export type ProfileUpdateValues = z.infer<typeof profileUpdateSchema>;
export type ProfileUpdateField = keyof ProfileUpdateValues;

const FIELD_OF: Record<ProfileUpdateChange['field'], ProfileUpdateField> = {
  PERSONAL_EMAIL: 'personalEmail',
  PHONE: 'phone',
  ADDRESS: 'address',
  EMERGENCY_CONTACT_NAME: 'contactName',
  EMERGENCY_CONTACT_RELATIONSHIP: 'contactRelationship',
  EMERGENCY_CONTACT_PHONE: 'contactPhone',
};

/** The backend's field paths (`personal.phone`, `personal.emergencyContact.phone`…) to the form's fields. */
export const SERVER_PATHS: Record<string, ProfileUpdateField> = {
  'personal.personalEmail': 'personalEmail',
  'personal.phone': 'phone',
  'personal.address': 'address',
  'personal.emergencyContact.name': 'contactName',
  'personal.emergencyContact.relationship': 'contactRelationship',
  'personal.emergencyContact.phone': 'contactPhone',
};

/** The form starts from the profile, with the proposal of a returned request on top. */
export function valuesOf(profile: EmployeeProfile, changes: ProfileUpdateChange[] = [], note: string | null = null): ProfileUpdateValues {
  const { personal } = profile;
  const values: ProfileUpdateValues = {
    personalEmail: personal.personalEmail ?? '',
    phone: personal.phone ? formatPhone(personal.phone) : '',
    address: personal.address ?? '',
    contactName: personal.emergencyContact?.name ?? '',
    contactRelationship: personal.emergencyContact?.relationship ?? '',
    contactPhone: personal.emergencyContact?.phone ? formatPhone(personal.emergencyContact.phone) : '',
    note: note ?? '',
  };
  for (const change of changes) values[FIELD_OF[change.field]] = change.newValue ?? '';
  return values;
}

const orNull = (value: string) => value.trim() || null;

export function inputOf(v: ProfileUpdateValues): ProfileUpdateInput {
  const contact = { name: orNull(v.contactName), relationship: orNull(v.contactRelationship), phone: orNull(v.contactPhone) };
  return {
    personalEmail: orNull(v.personalEmail),
    phone: orNull(v.phone),
    address: orNull(v.address),
    emergencyContact: contact.name || contact.relationship || contact.phone ? contact : null,
    note: orNull(v.note),
  };
}
