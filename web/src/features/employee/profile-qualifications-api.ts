import { useQuery } from '@tanstack/react-query';
import { CATALOGS_KEY, type CatalogItem, type CatalogPage } from '@/features/catalog/api';
import { api } from '@/lib/api';
import { profileRecordsKey } from './profile-records-api';

export type EmployeeSkill = {
  id: string;
  skill: { id: string; code: string | null; name: string; active: boolean };
  level: number;
};
export type EmployeeCertificate = {
  id: string;
  name: string;
  issuer: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  attachmentId: string | null;
};
export type SkillBody = { skillId: string; level: number };
export type CertificateBody = Omit<EmployeeCertificate, 'id'>;

const base = (id: string) => `/api/employees/${id}`;
export const skillsKey = (id: string) => profileRecordsKey(id, 'skills');
export const certificatesKey = (id: string) => profileRecordsKey(id, 'certificates');

export function useSkillCatalog() {
  return useQuery({ queryKey: [...CATALOGS_KEY, 'skills', 'picker'], queryFn: async () => {
    const items: CatalogItem[] = [];
    for (let page = 0; ; page += 1) {
      const result = await api<CatalogPage>(`/api/catalogs/skills/items?page=${page}&size=200`);
      items.push(...result.items);
      if (items.length >= result.total || result.items.length === 0) return items;
    }
  } });
}

export function useEmployeeSkills(id: string) {
  return useQuery({ queryKey: skillsKey(id), queryFn: () => api<EmployeeSkill[]>(`${base(id)}/skills`) });
}
export function useEmployeeCertificates(id: string) {
  return useQuery({ queryKey: certificatesKey(id), queryFn: () => api<EmployeeCertificate[]>(`${base(id)}/certificates`) });
}
export function saveSkill(id: string, body: SkillBody, recordId?: string) {
  return api<EmployeeSkill>(`${base(id)}/skills${recordId ? `/${recordId}` : ''}`, { method: recordId ? 'PUT' : 'POST', body });
}
export function removeSkill(id: string, recordId: string) {
  return api(`${base(id)}/skills/${recordId}`, { method: 'DELETE' });
}
export function saveCertificate(id: string, body: CertificateBody, recordId?: string) {
  return api<EmployeeCertificate>(`${base(id)}/certificates${recordId ? `/${recordId}` : ''}`, { method: recordId ? 'PUT' : 'POST', body });
}
export function removeCertificate(id: string, recordId: string) {
  return api(`${base(id)}/certificates/${recordId}`, { method: 'DELETE' });
}
