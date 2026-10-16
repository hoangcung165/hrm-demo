// zod schema of the "Cấu hình nghỉ phép" form; same rules as the backend (`LeavePolicyService`). Numbers are typed as
// text and may use a decimal comma ("1,5"). Messages are i18n keys.
import { z } from 'zod';
import { ApiError } from '@/lib/api';
import type { LeavePay } from './api';
import type { LeaveAccrual, LeavePolicyValues, LeaveTypeItem } from './policy-api';

export const NAME_MAX = 100;

/** "1,5" or "1.5" → 1.5; null for an empty field; NaN for anything else. */
export const parseDays = (value: string): number | null => {
  const text = value.trim().replace(',', '.');
  if (!text) return null;
  return /^\d+(\.\d+)?$/.test(text) ? Number(text) : Number.NaN;
};

const halfSteps = (min: number, max: number, optional: boolean) => (value: string) => {
  const days = parseDays(value);
  if (days === null) return optional;
  return Number.isFinite(days) && days >= min && days <= max && Number.isInteger(days * 2);
};

const VALID_EXPIRY = /^(0?[1-9]|[12]\d|3[01])\/(0?[1-9]|1[0-2])$/;

export const policySchema = z
  .object({
    code: z.string().trim().regex(/^[A-Za-z0-9_-]{1,20}$/, 'leave.policy.validation.code'),
    name: z.string().trim().min(1, 'leave.policy.validation.nameRequired').max(NAME_MAX, 'leave.policy.validation.nameTooLong'),
    effectiveFrom: z.string().min(1, 'leave.policy.validation.fromRequired').refine((value) => value >= '2000-01-01' && value <= '9999-12-31', 'leave.policy.validation.from'),
    pay: z.enum(['COMPANY', 'SOCIAL_INSURANCE', 'UNPAID']),
    halfDayAllowed: z.boolean(),
    attachmentRequired: z.boolean(),
    limited: z.boolean(),
    entitlementDays: z.string(),
    seniorityStepYears: z.string().refine((value) => !value.trim() || (/^\d+$/.test(value.trim()) && Number(value) <= 50), 'leave.policy.validation.step'),
    accrual: z.enum(['MONTHLY', 'YEARLY']),
    cutOffDay: z.string().refine((value) => /^\d+$/.test(value.trim()) && Number(value) >= 1 && Number(value) <= 31, 'leave.policy.validation.cutOff'),
    advanceAllowed: z.boolean(),
    maxDaysPerRequest: z.string().refine(halfSteps(0.5, 366, true), 'leave.policy.validation.maxPerRequest'),
    carryOverMaxDays: z.string().refine(halfSteps(0, 365, true), 'leave.policy.validation.carryOver'),
    carryOverExpiry: z.string().refine((value) => !value.trim() || VALID_EXPIRY.test(value.trim()), 'leave.policy.validation.expiry'),
  })
  .refine((values) => !values.limited || halfSteps(0.5, 365, false)(values.entitlementDays), { path: ['entitlementDays'], message: 'leave.policy.validation.entitlement' });

export type PolicyFormValues = z.infer<typeof policySchema>;
export type PolicyFormField = keyof PolicyFormValues;

const text = (value: number | null) => (value === null ? '' : String(value).replace('.', ','));
const pad = (value: string) => value.padStart(2, '0');

/** A type's policy in force, or a new type's defaults (company pays, half days, monthly accrual from today). */
export function policyFormValues(type: LeaveTypeItem | null, today: string): PolicyFormValues {
  const p = type?.policy;
  const expiry = p?.carryOverExpiry?.split('-');
  return {
    code: type?.code ?? '',
    name: type?.name ?? '',
    effectiveFrom: p && p.effectiveFrom > today ? p.effectiveFrom : today,
    pay: (p?.pay ?? 'COMPANY') as LeavePay,
    halfDayAllowed: p?.halfDayAllowed ?? true,
    attachmentRequired: p?.attachmentRequired ?? false,
    limited: p?.limited ?? false,
    entitlementDays: text(p?.entitlementDays ?? null),
    seniorityStepYears: p?.seniorityStepYears ? String(p.seniorityStepYears) : '',
    accrual: (p?.accrual ?? 'MONTHLY') as LeaveAccrual,
    cutOffDay: String(p?.cutOffDay ?? 15),
    advanceAllowed: p?.advanceAllowed ?? false,
    maxDaysPerRequest: text(p?.maxDaysPerRequest ?? null),
    carryOverMaxDays: text(p?.carryOverMaxDays ?? null),
    carryOverExpiry: expiry ? `${expiry[1]}/${expiry[0]}` : '',
  };
}

/** The body of `PUT /policy`; a type without a limit sends none of the limit fields. */
export function policyBody(values: PolicyFormValues): LeavePolicyValues {
  const [day, month] = values.carryOverExpiry.trim().split('/');
  const limited = values.limited;
  return {
    effectiveFrom: values.effectiveFrom,
    pay: values.pay,
    halfDayAllowed: values.halfDayAllowed,
    attachmentRequired: values.attachmentRequired,
    limited,
    entitlementDays: limited ? parseDays(values.entitlementDays) : null,
    seniorityStepYears: limited && values.seniorityStepYears.trim() ? Number(values.seniorityStepYears) : null,
    accrual: limited ? values.accrual : null,
    cutOffDay: Number(values.cutOffDay),
    advanceAllowed: limited && values.advanceAllowed,
    maxDaysPerRequest: parseDays(values.maxDaysPerRequest),
    carryOverMaxDays: limited ? parseDays(values.carryOverMaxDays) : null,
    carryOverExpiry: limited && day && month ? `${pad(month)}-${pad(day)}` : null,
  };
}

const MESSAGES: Partial<Record<PolicyFormField, string>> = {
  code: 'leave.policy.validation.code',
  name: 'leave.policy.validation.nameRequired',
  effectiveFrom: 'leave.policy.validation.from',
  entitlementDays: 'leave.policy.validation.entitlement',
  seniorityStepYears: 'leave.policy.validation.step',
  cutOffDay: 'leave.policy.validation.cutOff',
  maxDaysPerRequest: 'leave.policy.validation.maxPerRequest',
  carryOverMaxDays: 'leave.policy.validation.carryOver',
  carryOverExpiry: 'leave.policy.validation.expiry',
};

/** The backend's field errors (`policy.` prefixed when creating), on the form's fields. */
export function policyFieldErrors(error: unknown): Array<{ field: PolicyFormField; message: string }> {
  if (!(error instanceof ApiError) || error.code !== 'validation.invalid') return [];
  return error.fieldErrors.flatMap(({ field, code }) => {
    const name = field.replace(/^policy\./, '') as PolicyFormField;
    if (code === 'taken') return [{ field: name, message: 'leave.policy.validation.codeTaken' }];
    if (name === 'name' && code === 'too_long') return [{ field: name, message: 'leave.policy.validation.nameTooLong' }];
    const message = MESSAGES[name];
    return message ? [{ field: name, message }] : [];
  });
}
