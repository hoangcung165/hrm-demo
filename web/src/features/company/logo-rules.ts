// Client-side checks of a logo file, the same rules as the backend (PNG, JPEG or WebP, at most 1 MB).
export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const LOGO_ACCEPT = LOGO_TYPES.join(',');
export const LOGO_MAX_BYTES = 1024 * 1024;

/** The backend error `code` the file would get, or `null` when it may be uploaded. */
export function logoRejection(file: File): 'company.logo_unsupported_type' | 'company.logo_too_large' | null {
  if (!(LOGO_TYPES as readonly string[]).includes(file.type)) return 'company.logo_unsupported_type';
  if (file.size > LOGO_MAX_BYTES) return 'company.logo_too_large';
  return null;
}
