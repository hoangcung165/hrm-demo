// HRM-08/FE-2C: private documents are scoped at the API; never serve a public file URL.
import { useQuery } from '@tanstack/react-query';
import { api, apiDownload } from '@/lib/api';
import { saveFile } from '@/lib/save-file';
import { profileRecordsKey } from './profile-records-api';

export type ExpatDocumentType = 'PASSPORT' | 'VISA' | 'WORK_PERMIT';
export type ExpatDocument = {
  id: string; documentType: ExpatDocumentType; documentNumber: string; issuingCountry: string;
  issuedAt: string | null; expiresAt: string; masked: boolean;
};
export type ExpatDocumentBody = Omit<ExpatDocument, 'id' | 'masked'>;
export type Attachment = {
  id: string; fileName: string; contentType: string;
  contentLength: number; sha256: string; uploadedAt: string;
};
const base = (id: string) => `/api/employees/${id}`;
export const expatKey = (id: string) => profileRecordsKey(id, 'expat-documents');
export const attachmentKey = (id: string) => profileRecordsKey(id, 'attachments');
export function useExpatDocuments(id: string) {
  return useQuery({ queryKey: expatKey(id),
    queryFn: () => api<ExpatDocument[]>(`${base(id)}/expat-documents`) });
}
export function useEmployeeAttachments(id: string, enabled = true) {
  return useQuery({ queryKey: attachmentKey(id),
    queryFn: () => api<Attachment[]>(`${base(id)}/attachments`), enabled });
}
export function writeExpat(id: string, body: ExpatDocumentBody, documentId?: string) {
  return api<ExpatDocument>(`${base(id)}/expat-documents${documentId ? `/${documentId}` : ''}`,
    { method: documentId ? 'PUT' : 'POST', body });
}
export function deleteExpat(id: string, documentId: string) {
  return api(`${base(id)}/expat-documents/${documentId}`, { method: 'DELETE' });
}
export function uploadAttachment(id: string, file: File) {
  const data = new FormData();
  data.append('file', file);
  return api<Attachment>(`${base(id)}/attachments`, { method: 'POST', body: data });
}
export async function downloadAttachment(id: string, attachment: Attachment) {
  const file = await apiDownload(`${base(id)}/attachments/${attachment.id}`);
  saveFile(file.blob, file.fileName ?? attachment.fileName);
}
export function deleteAttachment(id: string, attachmentId: string) {
  return api(`${base(id)}/attachments/${attachmentId}`, { method: 'DELETE' });
}
