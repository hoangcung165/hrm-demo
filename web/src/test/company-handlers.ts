// MSW handlers for the company API, shaped like the backend's responses ("## API contract" on issue #4).
import { http, HttpResponse } from 'msw';
import type { Company } from '@/features/company/api';
import { problem } from './auth-handlers';

export const COMPANY: Company = {
  name: 'Công ty Cổ phần Công nghệ Mẫu',
  taxCode: '0312345678',
  address: 'Tầng 5, 123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
  legalRepresentativeName: 'Phạm Quốc Bảo',
  legalRepresentativeTitle: 'Giám đốc',
  logoUrl: null,
  updatedAt: '2026-10-04T08:00:00Z',
};

export const LOGO_URL = '/api/company/logo?v=1791100800000';

/** GET only, always the same company. */
export const companyOk = (company: Company = COMPANY) => http.get('*/api/company', () => HttpResponse.json(company));

export type CompanyApi = {
  handlers: ReturnType<typeof http.get>[];
  /** Bodies of the PUT /api/company calls, and the uploaded files. */
  updates: unknown[];
  uploads: File[];
  current: () => Company;
};

/** The whole company API over one in-memory company, validating like the backend does. */
export function companyApi(initial: Partial<Company> = {}): CompanyApi {
  let company: Company = { ...COMPANY, ...initial };
  let version = 1791100800000;
  const touch = (changes: Partial<Company>) => {
    company = { ...company, ...changes, updatedAt: '2026-10-04T09:30:00Z' };
    return HttpResponse.json(company);
  };
  const updates: unknown[] = [];
  const uploads: File[] = [];
  const handlers = [
    http.get('*/api/company', () => HttpResponse.json(company)),
    http.put('*/api/company', async ({ request }) => {
      const body = (await request.json()) as Record<string, string | null>;
      updates.push(body);
      const errors = [];
      if (!body.name?.trim()) errors.push({ field: 'name', code: 'NotBlank' });
      if (body.taxCode && !/^\d{10}(-\d{3})?$/.test(body.taxCode)) errors.push({ field: 'taxCode', code: 'Pattern' });
      if (errors.length > 0) return problem(400, 'validation.invalid', { errors });
      return touch(body);
    }),
    http.put('*/api/company/logo', async ({ request }) => {
      const file = (await request.formData()).get('file');
      // Not `instanceof File`: under jsdom the global File is not the class the request parser returns.
      if (!file || typeof file === 'string' || file.size === 0) return problem(400, 'company.logo_missing');
      uploads.push(file);
      if (file.size > 1024 * 1024) return problem(413, 'company.logo_too_large');
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return problem(415, 'company.logo_unsupported_type');
      version += 1;
      return touch({ logoUrl: `/api/company/logo?v=${version}` });
    }),
    http.delete('*/api/company/logo', () => touch({ logoUrl: null })),
  ];
  return { handlers, updates, uploads, current: () => company };
}
