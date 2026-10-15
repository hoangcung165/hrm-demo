// Audit log API (HRM-13): read only, every call needs AUDIT_VIEW. The list is newest first and paged by the server.
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const AUDIT_ACTIONS = ['CREATE', 'UPDATE', 'DELETE'] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Mirrors the backend record `AuditLogListItem`. `occurredAt` is an ISO instant. */
export type AuditLogListItem = {
  id: string;
  occurredAt: string;
  /** Null: a change made by the system, not by an Account. */
  actorId: string | null;
  actorName: string | null;
  action: AuditAction;
  /** The registered key, e.g. `RESOURCE_SETTING`. */
  entityType: string;
  /** The English name the server knows the kind by; the screen shows its own translation when it has one. */
  entityLabel: string;
  entityId: string;
  /** English, as recorded. */
  summary: string;
};

/** Audited values by field name. Masked fields hold `***`. */
export type AuditValues = Record<string, unknown>;

/** Mirrors the backend record `AuditLogResponse`: `before` is null on a CREATE, `after` on a DELETE. */
export type AuditLogRecord = AuditLogListItem & { before: AuditValues | null; after: AuditValues | null };

/** Mirrors `AuditEntityTypeResponse`. */
export type AuditEntityType = { key: string; label: string };

/** Mirrors `AuditActorResponse`. */
export type AuditActor = { id: string; name: string | null };

export type AuditLogPage = { items: AuditLogListItem[]; total: number };

export const AUDIT_PAGE_SIZE = 20;

/** `''` means no filter. `from` and `to` are company days (yyyy-MM-dd), both included. */
export type AuditLogQuery = {
  page: number;
  q: string;
  entityType: string;
  actorId: string;
  from: string;
  to: string;
};

export const AUDIT_KEY = ['audit-logs'] as const;

export function auditLogsPath(query: AuditLogQuery): string {
  const search = new URLSearchParams({ page: String(query.page), size: String(AUDIT_PAGE_SIZE) });
  if (query.entityType) search.set('entityType', query.entityType);
  if (query.actorId) search.set('actorId', query.actorId);
  if (query.from) search.set('from', query.from);
  if (query.to) search.set('to', query.to);
  if (query.q) search.set('q', query.q);
  return `/api/audit-logs?${search}`;
}

/** One page of records. The rows of the previous query stay while the next one loads. */
export function useAuditLogs(query: AuditLogQuery, enabled = true) {
  return useQuery({
    queryKey: [...AUDIT_KEY, 'list', query],
    queryFn: async () => ({ ...(await api<AuditLogPage>(auditLogsPath(query))), pageIndex: query.page }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** One record with its values before and after; `id` empty: nothing is asked. */
export function useAuditLog(id: string) {
  return useQuery({
    queryKey: [...AUDIT_KEY, 'one', id],
    queryFn: () => api<AuditLogRecord>(`/api/audit-logs/${id}`),
    enabled: id !== '',
  });
}

/** The kinds of record that are audited, for the "Đối tượng" filter. */
export function useAuditEntityTypes(enabled = true) {
  return useQuery({
    queryKey: [...AUDIT_KEY, 'entity-types'],
    queryFn: () => api<AuditEntityType[]>('/api/audit-logs/entity-types'),
    staleTime: 5 * 60_000,
    enabled,
  });
}

/** The people who appear in the log, for the "Người sửa" filter. */
export function useAuditActors(enabled = true) {
  return useQuery({
    queryKey: [...AUDIT_KEY, 'actors'],
    queryFn: () => api<AuditActor[]>('/api/audit-logs/actors'),
    enabled,
  });
}
