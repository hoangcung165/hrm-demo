// MSW handlers for the Audit log API over the fixture records, as the backend applies the query: `entityType`,
// `actorId`, `from` and `to` (company days, UTC+7, both included), `q` on the summary and the name (case ignored,
// accents kept), newest first, `page` and `size`. Only GET exists, as on the server.
import { delay, http, HttpResponse } from 'msw';
import type { AuditActor, AuditEntityType, AuditLogRecord } from '@/features/audit/api';
import { AUDIT_ACTORS, AUDIT_ENTITY_TYPES, AUDIT_RECORDS } from './audit-fixtures';
import { problem } from './auth-handlers';

const companyDay = (instant: string) => new Date(Date.parse(instant) + 7 * 3600_000).toISOString().slice(0, 10);
const UUID = /^[0-9a-f-]{36}$/i;

export type AuditApi = {
  handlers: Array<ReturnType<typeof http.get>>;
  /** The query string of every list request, in order. */
  requests: string[];
  /** The ids of the records opened. */
  opened: string[];
};

export function auditApi(
  source: AuditLogRecord[] = AUDIT_RECORDS,
  { delayMs = 0, types = AUDIT_ENTITY_TYPES, actors = AUDIT_ACTORS }: { delayMs?: number; types?: AuditEntityType[]; actors?: AuditActor[] } = {},
): AuditApi {
  const requests: string[] = [];
  const opened: string[] = [];
  const handlers = [
    http.get('*/api/audit-logs/entity-types', () => HttpResponse.json(types)),
    http.get('*/api/audit-logs/actors', () => HttpResponse.json(actors)),
    http.get('*/api/audit-logs/:id', async ({ params }) => {
      const id = String(params.id);
      if (!UUID.test(id)) return problem(400, 'validation.invalid');
      opened.push(id);
      await delay(delayMs);
      const found = source.find((record) => record.id === id);
      return found ? HttpResponse.json(found) : problem(404, 'audit_log.not_found');
    }),
    http.get('*/api/audit-logs', async ({ request }) => {
      const search = new URL(request.url).searchParams;
      requests.push(search.toString());
      await delay(delayMs);
      const page = Number(search.get('page') ?? 0);
      const size = Number(search.get('size') ?? 20);
      if (page < 0 || size < 1 || size > 100) return problem(400, 'validation.invalid');
      const q = (search.get('q') ?? '').trim().toLowerCase();
      const from = search.get('from');
      const to = search.get('to');
      const matching = source
        .filter((record) => !search.get('entityType') || record.entityType === search.get('entityType'))
        .filter((record) => !search.get('actorId') || record.actorId === search.get('actorId'))
        .filter((record) => !from || companyDay(record.occurredAt) >= from)
        .filter((record) => !to || companyDay(record.occurredAt) <= to)
        .filter((record) => !q || `${record.summary} ${record.actorName ?? ''}`.toLowerCase().includes(q))
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id));
      const items = matching.slice(page * size, page * size + size).map(({ before: _before, after: _after, ...item }) => item);
      return HttpResponse.json({ items, total: matching.length });
    }),
  ];
  return { handlers, requests, opened };
}

export const auditListStatus = (status: number, code: string) => http.get('*/api/audit-logs', () => problem(status, code));
export const auditRecordFails = () => http.get('*/api/audit-logs/:id', ({ params }) => (UUID.test(String(params.id)) ? problem(500, 'error.unknown') : undefined));
