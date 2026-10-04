// zod schema of the company form; same limits as the backend (`CompanyInfoRequest`). Messages are i18n keys.
import { z } from 'zod';
import type { FieldError } from '@/lib/api';
import type { Company } from './api';

export const NAME_MAX = 200;
export const ADDRESS_MAX = 500;
export const REPRESENTATIVE_MAX = 100;

export const companySchema = z.object({
  name: z.string().trim().min(1, 'company.validation.nameRequired').max(NAME_MAX, 'company.validation.nameTooLong'),
  // 10 digits, or 10 digits + "-" + 3 digits for a dependent unit; empty clears it.
  taxCode: z.string().trim().regex(/^(\d{10}(-\d{3})?)?$/, 'company.validation.taxCode'),
  address: z.string().trim().max(ADDRESS_MAX, 'company.validation.addressTooLong'),
  legalRepresentativeName: z.string().trim().max(REPRESENTATIVE_MAX, 'company.validation.representativeNameTooLong'),
  legalRepresentativeTitle: z.string().trim().max(REPRESENTATIVE_MAX, 'company.validation.representativeTitleTooLong'),
});
export type CompanyValues = z.infer<typeof companySchema>;

export const COMPANY_FIELDS = ['name', 'taxCode', 'address', 'legalRepresentativeName', 'legalRepresentativeTitle'] as const;
export type CompanyField = (typeof COMPANY_FIELDS)[number];

export function toCompanyValues(company: Company): CompanyValues {
  return {
    name: company.name,
    taxCode: company.taxCode ?? '',
    address: company.address ?? '',
    legalRepresentativeName: company.legalRepresentativeName ?? '',
    legalRepresentativeTitle: company.legalRepresentativeTitle ?? '',
  };
}

// Backend `validation.invalid` field errors (bean validation constraint names) use the same messages as zod.
const BACKEND_MESSAGES: Record<CompanyField, Partial<Record<string, string>>> = {
  name: { NotBlank: 'company.validation.nameRequired', Size: 'company.validation.nameTooLong' },
  taxCode: { Pattern: 'company.validation.taxCode' },
  address: { Size: 'company.validation.addressTooLong' },
  legalRepresentativeName: { Size: 'company.validation.representativeNameTooLong' },
  legalRepresentativeTitle: { Size: 'company.validation.representativeTitleTooLong' },
};

/** Backend field errors as form errors, in form order so the first one can take focus. */
export function backendFieldErrors(errors: FieldError[]): { field: CompanyField; message: string }[] {
  return COMPANY_FIELDS.flatMap((field) => {
    const error = errors.find((candidate) => candidate.field === field);
    if (!error) return [];
    return [{ field, message: BACKEND_MESSAGES[field][error.code] ?? 'error.validation.invalid' }];
  });
}
