import type { TFunction } from 'i18next';
import { ApiError } from '@/lib/api';
import { formatFileSize } from '@/lib/format';

const LOGO_CODES = ['company.logo_too_large', 'company.logo_unsupported_type', 'company.logo_missing'];

/** Why a logo was rejected, naming the file. The same text for the client-side check and the backend `code`. */
export function logoErrorMessage(code: string | null, file: File, t: TFunction): string {
  if (code && LOGO_CODES.includes(code)) return t(`error.${code}`, { name: file.name, size: formatFileSize(file.size) });
  if (code === 'auth.forbidden') return t('error.auth.forbidden');
  return t('company.logo.uploadFailed');
}

/** Detail line of a failed save or removal: no permission, or the connection hint. */
export function failureHint(error: unknown, t: TFunction): string {
  if (error instanceof ApiError && error.code === 'auth.forbidden') return t('error.auth.forbidden');
  return t('state.errorHint');
}
