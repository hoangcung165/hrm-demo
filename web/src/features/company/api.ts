// Company API (the single Legal entity, "Công ty" in the UI). Contract: "## API contract" comment on issue #4.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CompanyValues } from './schemas';

/** Mirrors the backend record `CompanyInfoResponse`. */
export type Company = {
  name: string;
  taxCode: string | null;
  address: string | null;
  legalRepresentativeName: string | null;
  legalRepresentativeTitle: string | null;
  /** Relative URL with a version that changes on every upload, or `null` when there is no logo. */
  logoUrl: string | null;
  updatedAt: string;
};

/** Mirrors the backend record `CompanyInfoRequest`; `null` clears an optional field. */
type CompanyInfoRequest = { [K in keyof CompanyValues]: K extends 'name' ? string : string | null };

export const COMPANY_KEY = ['company'] as const;

/** The company, shared by the Company page and the app shell header. */
export function useCompany() {
  return useQuery({ queryKey: COMPANY_KEY, queryFn: () => api<Company>('/api/company') });
}

/** Every mutation returns the company; writing it to the cache updates the header without a reload. */
function useCompanyMutation<TInput>(mutationFn: (input: TInput) => Promise<Company>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (company) => queryClient.setQueryData(COMPANY_KEY, company),
  });
}

export function useUpdateCompany() {
  return useCompanyMutation((values: CompanyValues) => {
    const body: CompanyInfoRequest = {
      name: values.name,
      taxCode: values.taxCode || null,
      address: values.address || null,
      legalRepresentativeName: values.legalRepresentativeName || null,
      legalRepresentativeTitle: values.legalRepresentativeTitle || null,
    };
    return api<Company>('/api/company', { method: 'PUT', body });
  });
}

export function useUploadCompanyLogo() {
  return useCompanyMutation((file: File) => {
    const body = new FormData();
    body.append('file', file);
    return api<Company>('/api/company/logo', { method: 'PUT', body });
  });
}

export function useRemoveCompanyLogo() {
  return useCompanyMutation(() => api<Company>('/api/company/logo', { method: 'DELETE' }));
}
