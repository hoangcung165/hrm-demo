// zod schema of the thresholds dialog; same rules as the backend (`ResourceThresholds.check`). Messages are i18n keys.
import { z } from 'zod';
import { ApiError } from '@/lib/api';
import type { ResourceThresholds } from './api';

/** The whole number in a field, or `null` when it is empty, not a whole number or outside `min`–`max`. */
export function parseWhole(value: string, min: number, max: number): number | null {
  const text = value.trim();
  if (!/^\d{1,3}$/.test(text)) return null;
  const number = Number(text);
  return number >= min && number <= max ? number : null;
}

export const MAX_ENDING_WEEKS = 12;

const fields = z.object({
  benchPercent: z.string().refine((value) => parseWhole(value, 1, 99) !== null, 'resources.settings.validation.bench'),
  nearFullPercent: z.string().refine((value) => parseWhole(value, 2, 100) !== null, 'resources.settings.validation.nearFull'),
  endingWeeks: z.string().refine((value) => parseWhole(value, 1, MAX_ENDING_WEEKS) !== null, 'resources.settings.validation.endingWeeks'),
});

export type SettingsFormValues = z.infer<typeof fields>;
export type SettingsField = keyof SettingsFormValues;
export const SETTINGS_FIELDS: readonly SettingsField[] = ['benchPercent', 'nearFullPercent', 'endingWeeks'];

export const settingsSchema = fields.superRefine((values, ctx) => {
  const bench = parseWhole(values.benchPercent, 1, 99);
  const nearFull = parseWhole(values.nearFullPercent, 2, 100);
  if (bench !== null && nearFull !== null && bench >= nearFull) ctx.addIssue({ code: 'custom', path: ['benchPercent'], message: 'resources.settings.validation.benchBelowNearFull' });
});

export const initialValues = (thresholds: ResourceThresholds): SettingsFormValues => ({
  benchPercent: String(thresholds.benchPercent),
  nearFullPercent: String(thresholds.nearFullPercent),
  endingWeeks: String(thresholds.endingWeeks),
});

/** The request body, or `null` while a field is not valid. */
export function toThresholds(values: SettingsFormValues): ResourceThresholds | null {
  const benchPercent = parseWhole(values.benchPercent, 1, 99);
  const nearFullPercent = parseWhole(values.nearFullPercent, 2, 100);
  const endingWeeks = parseWhole(values.endingWeeks, 1, MAX_ENDING_WEEKS);
  if (benchPercent === null || nearFullPercent === null || endingWeeks === null || benchPercent >= nearFullPercent) return null;
  return { benchPercent, nearFullPercent, endingWeeks };
}

export const sameThresholds = (a: ResourceThresholds, b: ResourceThresholds) =>
  a.benchPercent === b.benchPercent && a.nearFullPercent === b.nearFullPercent && a.endingWeeks === b.endingWeeks;

// The backend's `validation.invalid` field codes (`<field>:<code>`), mapped to the zod message of the same rule.
const BACKEND_MESSAGES: Record<string, string> = {
  'benchPercent:required': 'resources.settings.validation.bench',
  'benchPercent:out_of_range': 'resources.settings.validation.bench',
  'benchPercent:not_below_near_full': 'resources.settings.validation.benchBelowNearFull',
  'nearFullPercent:required': 'resources.settings.validation.nearFull',
  'nearFullPercent:out_of_range': 'resources.settings.validation.nearFull',
  'endingWeeks:required': 'resources.settings.validation.endingWeeks',
  'endingWeeks:out_of_range': 'resources.settings.validation.endingWeeks',
};

/** Every failing field of a rejected save, in form order so the first can take focus; empty when it is not about a field. */
export function settingsFieldErrors(error: unknown): Array<{ field: SettingsField; message: string }> {
  if (!(error instanceof ApiError) || error.code !== 'validation.invalid') return [];
  return SETTINGS_FIELDS.flatMap((field) => {
    const found = error.fieldErrors.find((candidate) => candidate.field === field);
    return found ? [{ field, message: BACKEND_MESSAGES[`${field}:${found.code}`] ?? 'error.validation.invalid' }] : [];
  });
}
