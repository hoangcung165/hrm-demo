// zod schema of the allocate dialog; same rules as the backend (`AllocationService`). Messages are i18n keys.
import { z } from 'zod';
import { ApiError } from '@/lib/api';

/** The whole-number percent in the field, or `null` when it is empty, not a whole number or outside 1–100. */
export function parsePercent(value: string): number | null {
  const text = value.trim();
  if (!/^\d{1,3}$/.test(text)) return null;
  const percent = Number(text);
  return percent >= 1 && percent <= 100 ? percent : null;
}

const fields = z.object({
  employeeId: z.string().min(1, 'projects.allocate.validation.employeeRequired'),
  projectRoleId: z.string().min(1, 'projects.allocate.validation.roleRequired'),
  /** The text of the field; whole numbers 1–100. */
  percent: z.string().refine((value) => parsePercent(value) !== null, 'projects.allocate.validation.percent'),
  startDate: z.string().min(1, 'projects.allocate.validation.startRequired'),
  endDate: z.string().min(1, 'projects.allocate.validation.endRequired'),
});

export type AllocationFormValues = z.infer<typeof fields>;

/** `range`: the dates of the project, which the allocation must fit inside. */
export const allocationSchema = (range: { start: string; end: string }) =>
  fields.superRefine((values, ctx) => {
    const { startDate, endDate } = values;
    if (startDate && (startDate < range.start || startDate > range.end)) ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'projects.allocate.validation.outsideProject' });
    if (endDate && (endDate < range.start || endDate > range.end)) ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'projects.allocate.validation.outsideProject' });
    if (startDate && endDate && endDate < startDate) ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'projects.allocate.validation.endBeforeStart' });
  });

const FIELDS = ['employeeId', 'projectRoleId', 'percent', 'startDate', 'endDate'] as const;
export type AllocationFormField = (typeof FIELDS)[number];

// The backend's `validation.invalid` field codes, mapped to the zod messages of the same rule.
const BACKEND_MESSAGES: Record<string, string> = {
  'employeeId.required': 'projects.allocate.validation.employeeRequired',
  'projectRoleId.required': 'projects.allocate.validation.roleRequired',
  'percent.required': 'projects.allocate.validation.percent',
  'percent.out_of_range': 'projects.allocate.validation.percent',
  'startDate.required': 'projects.allocate.validation.startRequired',
  'startDate.outside_project': 'projects.allocate.validation.outsideProject',
  'endDate.required': 'projects.allocate.validation.endRequired',
  'endDate.outside_project': 'projects.allocate.validation.outsideProject',
  'endDate.before_start': 'projects.allocate.validation.endBeforeStart',
};

const CODE_FIELDS: Record<string, AllocationFormField> = {
  'allocation.already_in_project': 'employeeId',
  'allocation.employee_not_found': 'employeeId',
  'allocation.project_role_not_found': 'projectRoleId',
  'allocation.project_role_inactive': 'projectRoleId',
};

/** The field errors a failed save maps to, in form order; empty when it is not about a field. */
export function allocationFieldErrors(error: unknown): Array<{ field: AllocationFormField; message: string }> {
  if (!(error instanceof ApiError)) return [];
  const field = CODE_FIELDS[error.code];
  if (field) return [{ field, message: `projects.allocate.error.${error.code.replace('allocation.', '')}` }];
  if (error.code !== 'validation.invalid') return [];
  return FIELDS.flatMap((name) => {
    const found = error.fieldErrors.find((candidate) => candidate.field === name);
    return found ? [{ field: name, message: BACKEND_MESSAGES[`${name}.${found.code}`] ?? 'error.validation.invalid' }] : [];
  });
}
