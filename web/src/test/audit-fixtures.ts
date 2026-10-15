// Audit log records for the web tests: the three threshold changes of the example data (Giám đốc, Admin, Giám đốc),
// one record of a kind the screen has no translation for, with a masked field, one made by the system, and enough older
// ones for a second page. Times are instants; the company day is UTC+7.
import type { AuditActor, AuditEntityType, AuditLogRecord } from '@/features/audit/api';

export const DIRECTOR_ACTOR = '0000000a-0000-4000-a000-000000000001';
export const ADMIN_ACTOR = '0000000a-0000-4000-a000-000000000002';
export const HR_ACTOR = '0000000a-0000-4000-a000-000000000003';
const COMPANY = '0000000c-0000-4000-a000-000000000001';

export const auditId = (n: number) => `0000000b-0000-4000-a000-${String(n).padStart(12, '0')}`;

const thresholds = (bench: number, nearFull: number, weeks: number) => ({ benchPercent: bench, nearFullPercent: nearFull, endingWeeks: weeks });

/** Newest first. */
export const AUDIT_RECORDS: AuditLogRecord[] = [
  {
    id: auditId(1),
    occurredAt: '2026-10-14T03:05:00Z',
    actorId: DIRECTOR_ACTOR,
    actorName: 'Phạm Quốc Bảo',
    action: 'UPDATE',
    entityType: 'RESOURCE_SETTING',
    entityLabel: 'Resource thresholds',
    entityId: COMPANY,
    summary: 'Resource thresholds restored to the defaults',
    before: thresholds(40, 85, 6),
    after: thresholds(50, 90, 4),
  },
  {
    id: auditId(2),
    occurredAt: '2026-10-12T07:30:00Z',
    actorId: ADMIN_ACTOR,
    actorName: 'Đỗ Minh Quân',
    action: 'UPDATE',
    entityType: 'RESOURCE_SETTING',
    entityLabel: 'Resource thresholds',
    entityId: COMPANY,
    summary: 'Resource thresholds changed',
    before: { nearFullPercent: 90 },
    after: { nearFullPercent: 85 },
  },
  {
    id: auditId(3),
    occurredAt: '2026-10-11T18:00:00Z',
    actorId: HR_ACTOR,
    actorName: 'Trần Thị Mai',
    action: 'CREATE',
    entityType: 'BANK_ACCOUNT',
    entityLabel: 'Bank account',
    entityId: COMPANY,
    summary: 'Bank account added',
    before: null,
    after: { bankName: 'Ngân hàng Mẫu', accountNumber: '***', primary: true },
  },
  {
    id: auditId(4),
    occurredAt: '2026-10-10T02:15:00Z',
    actorId: DIRECTOR_ACTOR,
    actorName: 'Phạm Quốc Bảo',
    action: 'UPDATE',
    entityType: 'RESOURCE_SETTING',
    entityLabel: 'Resource thresholds',
    entityId: COMPANY,
    summary: 'Resource thresholds changed',
    before: { benchPercent: 50, endingWeeks: 4 },
    after: { benchPercent: 40, endingWeeks: 6 },
  },
  {
    id: auditId(5),
    occurredAt: '2026-10-09T01:00:00Z',
    actorId: null,
    actorName: null,
    action: 'DELETE',
    entityType: 'RESOURCE_SETTING',
    entityLabel: 'Resource thresholds',
    entityId: COMPANY,
    summary: 'Old setting removed',
    before: { benchPercent: 45 },
    after: null,
  },
  // Older changes, one a day, for a second page.
  ...Array.from({ length: 18 }, (_, index): AuditLogRecord => ({
    id: auditId(100 + index),
    occurredAt: new Date(Date.UTC(2026, 8, 30 - index, 2, 0)).toISOString(),
    actorId: ADMIN_ACTOR,
    actorName: 'Đỗ Minh Quân',
    action: 'UPDATE',
    entityType: 'RESOURCE_SETTING',
    entityLabel: 'Resource thresholds',
    entityId: COMPANY,
    summary: `Resource thresholds changed (${index + 1})`,
    before: { endingWeeks: 4 },
    after: { endingWeeks: 5 },
  })),
];

export const AUDIT_ENTITY_TYPES: AuditEntityType[] = [{ key: 'RESOURCE_SETTING', label: 'Resource thresholds' }];

export const AUDIT_ACTORS: AuditActor[] = [
  { id: DIRECTOR_ACTOR, name: 'Phạm Quốc Bảo' },
  { id: HR_ACTOR, name: 'Trần Thị Mai' },
  { id: ADMIN_ACTOR, name: 'Đỗ Minh Quân' },
];
