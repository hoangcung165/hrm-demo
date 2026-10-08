// zod schema of the add/edit unit form; same rules as the backend (`OrgUnitCreateRequest`). Messages are i18n keys.
import { z } from 'zod';
import { ApiError } from '@/lib/api';
import type { OrgUnitType } from './api';

export const ORG_UNIT_TYPES = ['BRANCH', 'DEPARTMENT', 'TEAM'] as const satisfies readonly OrgUnitType[];
export const NAME_MAX = 150;
export const CODE_MAX = 10;

export const orgUnitSchema = z.object({
  name: z.string().trim().min(1, 'org.validation.nameRequired').max(NAME_MAX, 'org.validation.nameTooLong'),
  // Upper-cased like the backend does before it validates.
  code: z.string().trim().toUpperCase().min(1, 'org.validation.codeRequired').regex(/^[A-Z0-9-]{2,10}$/, 'org.validation.code'),
  /** An `OrgUnitType`; `''` until one is chosen. */
  type: z.string().refine((value) => (ORG_UNIT_TYPES as readonly string[]).includes(value), 'org.validation.typeRequired'),
  /** A unit id, or `ROOT_ID` for the company. */
  parentId: z.string().min(1, 'org.validation.parentRequired'),
  /** The Trưởng đơn vị, an Employee id; `''` for none. */
  headEmployeeId: z.string(),
});
export type OrgUnitValues = z.infer<typeof orgUnitSchema>;

const FIELDS = ['name', 'code', 'type', 'parentId', 'headEmployeeId'] as const;
export type OrgUnitField = (typeof FIELDS)[number];

/** A server error shown under a field: an i18n key and the values for its placeholders. */
export type OrgUnitFieldError = { field: OrgUnitField; message: string; values?: Record<string, string> };

// Backend `validation.invalid` field errors (bean validation constraint names) use the same messages as zod.
const BACKEND_MESSAGES: Record<OrgUnitField, Partial<Record<string, string>>> = {
  name: { NotBlank: 'org.validation.nameRequired', Size: 'org.validation.nameTooLong' },
  code: { NotNull: 'org.validation.codeRequired', Pattern: 'org.validation.code' },
  type: { NotNull: 'org.validation.typeRequired', Pattern: 'org.validation.typeRequired' },
  parentId: {},
  headEmployeeId: {},
};

/** The field errors a failed save maps to, in form order so the first can take focus; empty when it is not about a field. */
export function orgUnitFieldErrors(error: unknown, values: OrgUnitValues): OrgUnitFieldError[] {
  if (!(error instanceof ApiError)) return [];
  switch (error.code) {
    case 'org_unit.code_taken': {
      const holder = error.details.holder as { name?: string } | undefined;
      // Without the holder (an older backend) the message would have a hole: fall back to the toast.
      return holder?.name ? [{ field: 'code', message: 'error.org_unit.code_taken', values: { code: values.code, name: holder.name } }] : [];
    }
    case 'org_unit.parent_inactive':
    case 'org_unit.parent_not_found':
      return [{ field: 'parentId', message: `error.${error.code}` }];
    case 'org_unit.head_not_found':
      return [{ field: 'headEmployeeId', message: 'error.org_unit.head_not_found' }];
    case 'org_unit.head_invalid':
      // The only reason so far: the head would close a loop of Quản lý trực tiếp.
      return [{ field: 'headEmployeeId', message: 'error.org_unit.head_invalid' }];
    case 'validation.invalid':
      return FIELDS.flatMap((field) => {
        const found = error.fieldErrors.find((candidate) => candidate.field === field);
        return found ? [{ field, message: BACKEND_MESSAGES[field][found.code] ?? 'error.validation.invalid' }] : [];
      });
    default:
      return [];
  }
}
