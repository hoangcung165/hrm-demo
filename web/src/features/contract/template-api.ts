// HRM-10/FE-4: versioned DOCX templates and protected contract exports.
import { useQuery } from '@tanstack/react-query';
import { api, apiDownload } from '@/lib/api';
import { saveFile } from '@/lib/save-file';

export type ContractTemplateSummary = {
  id: string;
  contractType: string;
  version: number;
  fileName: string;
  active: boolean;
  uploadedAt: string;
};
export const TEMPLATE_TYPES = ['FIXED_TERM', 'INDEFINITE', 'PROBATION', 'EMPLOYMENT_WITH_PROBATION', 'EMPLOYMENT'] as const;

export const contractTemplatesKey = (type: string) => ['contract-templates', type] as const;

export function useContractTemplates(type: string, enabled: boolean) {
  return useQuery({
    queryKey: contractTemplatesKey(type),
    queryFn: () => api<ContractTemplateSummary[]>(`/api/contract-templates/${encodeURIComponent(type)}`),
    enabled,
  });
}

export const validateDocx = (file: File): 'type' | 'size' | null => {
  if (!file.name.toLowerCase().endsWith('.docx')) return 'type';
  if (file.size === 0 || file.size > 2 * 1024 * 1024) return 'size';
  return null;
};

export async function uploadContractTemplate(type: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  return api<ContractTemplateSummary>(`/api/contract-templates/${encodeURIComponent(type)}`, {
    method: 'POST', body: form,
  });
}

export type DocumentFormat = 'docx' | 'pdf';

export async function downloadContractDocument(employeeId: string, contractId: string, format: DocumentFormat) {
  const file = await apiDownload(
    `/api/employees/${employeeId}/contracts/${contractId}/export?format=${format}`
  );
  saveFile(file.blob, file.fileName ?? `contract-${contractId}.${format}`);
}
