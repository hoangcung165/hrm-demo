// zod schemas of the add and edit Account forms; same rules as the backend (`AccountCreateRequest`,
// `AccountUpdateRequest`, `PasswordPolicy`). Messages are i18n keys.
import { z } from 'zod';
import { ROLES, type Role } from '@/features/auth/account';
import { ApiError } from '@/lib/api';

export const FULL_NAME_MAX = 100;
export const EMAIL_MAX = 254;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

const shared = {
  fullName: z.string().trim().min(1, 'accounts.validation.fullNameRequired').max(FULL_NAME_MAX, 'accounts.validation.fullNameTooLong'),
  // Lower-cased like the backend does before it validates and stores.
  email: z.string().trim().toLowerCase().min(1, 'accounts.validation.emailRequired').max(EMAIL_MAX, 'accounts.validation.emailTooLong').email('validation.email'),
  roles: z.array(z.enum(ROLES)).min(1, 'accounts.validation.rolesRequired'),
};

/** Edit: the password is not part of the form; its field stays `''`. */
export const accountEditSchema = z.object({ ...shared, password: z.string() });
// A temporary password, kept as typed (spaces count).
const temporaryPassword = z.string().min(1, 'accounts.validation.passwordRequired').min(PASSWORD_MIN, 'validation.passwordMin').max(PASSWORD_MAX, 'validation.passwordMax');
/** Add: with the temporary password. */
export const accountAddSchema = z.object({ ...shared, password: temporaryPassword });
/** "Đặt mật khẩu tạm": the password alone. */
export const accountPasswordSchema = z.object({ password: temporaryPassword });
export type AccountPasswordValues = z.infer<typeof accountPasswordSchema>;
export type AccountValues = z.infer<typeof accountAddSchema>;

/** Roles in the order of the `Role` enum, as the list shows them and the form offers them. */
export const inRoleOrder = (roles: readonly Role[]): Role[] => ROLES.filter((role) => roles.includes(role));

/** Whether the edit form differs from the Account it started from, comparing what would be sent. */
export function accountChanged(values: Pick<AccountValues, 'fullName' | 'email' | 'roles'>, initial: Pick<AccountValues, 'fullName' | 'email' | 'roles'>): boolean {
  return values.fullName.trim() !== initial.fullName || values.email.trim().toLowerCase() !== initial.email || inRoleOrder(values.roles).join() !== inRoleOrder(initial.roles).join();
}

const FIELDS = ['fullName', 'email', 'password', 'roles'] as const;
export type AccountField = (typeof FIELDS)[number];

/** A server error shown under a field: an i18n key and the values for its placeholders. */
export type AccountFieldError = { field: AccountField; message: string; values?: Record<string, string> };

/** The message of a backend `password` field error; `Size` covers both ends of the password policy. */
export function passwordMessage(code: string | undefined, password: string): string | undefined {
  if (code === 'NotBlank') return 'accounts.validation.passwordRequired';
  if (code === 'Size') return password.length < PASSWORD_MIN ? 'validation.passwordMin' : 'validation.passwordMax';
  return undefined;
}

// Backend `validation.invalid` field errors (bean validation constraint names) use the same messages as zod.
const BACKEND_MESSAGES: Record<AccountField, (code: string, values: AccountValues) => string | undefined> = {
  fullName: (code) => ({ NotBlank: 'accounts.validation.fullNameRequired', Size: 'accounts.validation.fullNameTooLong' })[code],
  email: (code) => ({ NotBlank: 'accounts.validation.emailRequired', Size: 'accounts.validation.emailTooLong', Email: 'validation.email' })[code],
  password: (code, values) => passwordMessage(code, values.password),
  roles: (code) => ({ NotEmpty: 'accounts.validation.rolesRequired' })[code],
};

/** The field errors a failed save maps to, in form order so the first can take focus; empty when it is not about a field. */
export function accountFieldErrors(error: unknown, values: AccountValues): AccountFieldError[] {
  if (!(error instanceof ApiError)) return [];
  switch (error.code) {
    case 'account.email_taken': {
      const holder = error.details.holder as { fullName?: string } | undefined;
      // Without the holder the message would have a hole: fall back to the toast.
      return holder?.fullName ? [{ field: 'email', message: 'error.account.email_taken', values: { email: values.email, name: holder.fullName } }] : [];
    }
    case 'account.last_admin':
      return [{ field: 'roles', message: 'error.account.last_admin' }];
    case 'validation.invalid':
      return FIELDS.flatMap((field) => {
        const found = error.fieldErrors.find((candidate) => candidate.field === field);
        return found ? [{ field, message: BACKEND_MESSAGES[field](found.code, values) ?? 'error.validation.invalid' }] : [];
      });
    default:
      return [];
  }
}
