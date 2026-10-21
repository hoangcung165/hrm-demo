import { z } from 'zod';
import { EXPIRY_TYPES, type ExpiryAdvanceDays } from './api';

const days = z.string().regex(/^(?:0|[1-9]\d{0,2})$/, 'range').refine((value) => Number(value) <= 365, 'range');
export const expirySettingsSchema = z.object({
  CONTRACT: days, PROBATION: days, VISA: days, WORK_PERMIT: days, CERTIFICATE: days,
});
export type ExpirySettingsValues = z.infer<typeof expirySettingsSchema>;

export function toSettingsValues(values: ExpiryAdvanceDays): ExpirySettingsValues {
  return Object.fromEntries(EXPIRY_TYPES.map((type) => [type, String(values[type])])) as ExpirySettingsValues;
}

export function toAdvanceDays(values: ExpirySettingsValues): ExpiryAdvanceDays {
  return Object.fromEntries(EXPIRY_TYPES.map((type) => [type, Number(values[type])])) as ExpiryAdvanceDays;
}
