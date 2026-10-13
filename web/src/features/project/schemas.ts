// zod schema of the create/edit project form; same rules as the backend (`ProjectService`). Messages are i18n keys.
import { z } from 'zod';
import { ApiError } from '@/lib/api';
import { PROJECT_STATUSES } from './api';

export const CODE_MAX = 20;
export const NAME_MAX = 150;
export const CLIENT_MAX = 150;
const MAX_BUDGET = 999_999_999_999_999;

/** "2.400.000.000", "2400000000" or "2 400 000 000" → 2400000000; `null` for an empty field; `NaN` for anything else. */
export const parseBudget = (value: string): number | null => {
  const digits = value.replace(/[\s.,₫]/g, '');
  if (!digits) return null;
  return /^\d+$/.test(digits) ? Number(digits) : Number.NaN;
};

export const projectSchema = z
  .object({
    // Only checked when creating; on edit the code is shown, not sent.
    code: z.string().trim().min(1, 'projects.validation.codeRequired').regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,19}$/, 'projects.validation.code'),
    name: z.string().trim().min(1, 'projects.validation.nameRequired').max(NAME_MAX, 'projects.validation.nameTooLong'),
    client: z.string().trim().max(CLIENT_MAX, 'projects.validation.clientTooLong'),
    pmEmployeeId: z.string().min(1, 'projects.validation.pmRequired'),
    orgUnitId: z.string().min(1, 'projects.validation.unitRequired'),
    startDate: z.string().min(1, 'projects.validation.startRequired'),
    endDate: z.string().min(1, 'projects.validation.endRequired'),
    status: z.enum(PROJECT_STATUSES, { message: 'projects.validation.statusRequired' }),
    laborBudget: z.string().refine((value) => {
      const budget = parseBudget(value);
      return budget === null || (Number.isFinite(budget) && budget <= MAX_BUDGET);
    }, 'projects.validation.budget'),
  })
  .refine((values) => !values.startDate || !values.endDate || values.endDate >= values.startDate, { path: ['endDate'], message: 'projects.validation.endBeforeStart' });

export type ProjectFormValues = z.infer<typeof projectSchema>;

const FIELDS = ['code', 'name', 'client', 'pmEmployeeId', 'orgUnitId', 'startDate', 'endDate', 'status', 'laborBudget'] as const;
export type ProjectFormField = (typeof FIELDS)[number];

// The backend's `validation.invalid` field codes, mapped to the zod messages of the same rule.
const BACKEND_MESSAGES: Record<string, string> = {
  'code.required': 'projects.validation.codeRequired',
  'code.too_long': 'projects.validation.code',
  'code.invalid': 'projects.validation.code',
  'name.required': 'projects.validation.nameRequired',
  'name.too_long': 'projects.validation.nameTooLong',
  'client.too_long': 'projects.validation.clientTooLong',
  'pmEmployeeId.required': 'projects.validation.pmRequired',
  'orgUnitId.required': 'projects.validation.unitRequired',
  'startDate.required': 'projects.validation.startRequired',
  'endDate.required': 'projects.validation.endRequired',
  'endDate.before_start': 'projects.validation.endBeforeStart',
  'status.required': 'projects.validation.statusRequired',
  'status.invalid': 'projects.validation.statusRequired',
  'laborBudget.out_of_range': 'projects.validation.budget',
};

const CODE_FIELDS: Record<string, ProjectFormField> = {
  'project.code_taken': 'code',
  'project.pm_not_found': 'pmEmployeeId',
  'project.pm_not_self': 'pmEmployeeId',
  'project.org_unit_not_found': 'orgUnitId',
  'project.org_unit_inactive': 'orgUnitId',
};

/** The field errors a failed save maps to, in form order; empty when it is not about a field. */
export function projectFieldErrors(error: unknown): Array<{ field: ProjectFormField; message: string }> {
  if (!(error instanceof ApiError)) return [];
  const field = CODE_FIELDS[error.code];
  if (field) return [{ field, message: `projects.error.${error.code.replace('project.', '')}` }];
  if (error.code !== 'validation.invalid') return [];
  return FIELDS.flatMap((name) => {
    const found = error.fieldErrors.find((candidate) => candidate.field === name);
    return found ? [{ field: name, message: BACKEND_MESSAGES[`${name}.${found.code}`] ?? 'error.validation.invalid' }] : [];
  });
}
