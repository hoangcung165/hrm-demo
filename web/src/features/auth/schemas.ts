// zod schemas of the auth forms. Messages are i18n keys, translated by FormField.
import { z } from 'zod';

const newPassword = z.string().min(8, 'validation.passwordMin').max(72, 'validation.passwordMax');

export const loginSchema = z.object({
  email: z.email('validation.email'),
  password: z.string().min(1, 'validation.passwordRequired'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: z.email('validation.email') });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({ newPassword, confirmPassword: z.string() })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'validation.passwordMismatch',
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, 'validation.passwordRequired'), newPassword, confirmPassword: z.string() })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'validation.passwordMismatch',
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
