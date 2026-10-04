import type { TFunction } from 'i18next';
import { ApiError } from '@/lib/api';

/** Text for a failed API call: the translation of its backend `code`, or a generic line. */
export function errorMessage(error: unknown, t: TFunction): string {
  if (error instanceof ApiError) {
    return t(`error.${error.code}`, { defaultValue: t('error.unknown') });
  }
  return t('error.network');
}
