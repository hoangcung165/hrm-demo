import { z } from 'zod';
import { EXPIRY_TYPES, type ExpiryAdvanceDays } from './api';

// Shared by Zod and the browser's constraint validation, which focuses an invalid input on submit.
export const EXPIRY_DAYS_PATTERN = '(?:0|[1-9]|[1-9][0-9]|[12][0-9]{2}|3[0-5][0-9]|36[0-5])';
const days = z.string().regex(new RegExp(`^${EXPIRY_DAYS_PATTERN}$`), 'range');
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
