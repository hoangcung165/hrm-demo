import type { NotificationItem } from '../api';
import { notificationHref } from './notification-line';

const item = (overrides: Partial<NotificationItem>): NotificationItem => ({
  id: 'n1',
  kind: 'APPROVAL_WAITING',
  actor: null,
  onBehalfOf: null,
  requestId: 'r1',
  requestType: 'LEAVE',
  summary: null,
  level: 1,
  delegationId: null,
  createdAt: '2026-10-16T02:00:00Z',
  read: false,
  ...overrides,
});

describe('notificationHref', () => {
  it('opens a leave request on its own screen for the sender and the people copied, in the inbox for its approvers', () => {
    expect(notificationHref(item({ kind: 'LEAVE_COPIED' }))).toBe('/leave/requests/r1');
    expect(notificationHref(item({ kind: 'APPROVAL_APPROVED' }))).toBe('/leave/requests/r1');
    expect(notificationHref(item({ kind: 'APPROVAL_RETURNED' }))).toBe('/leave/requests/r1');
    expect(notificationHref(item({ kind: 'APPROVAL_WAITING' }))).toBe('/approvals/r1');
    expect(notificationHref(item({ kind: 'LEAVE_CANCELLED' }))).toBe('/approvals/r1');
    expect(notificationHref(item({ kind: 'APPROVAL_APPROVED', requestType: 'PROFILE_UPDATE' }))).toBe('/approvals/r1');
    expect(notificationHref(item({ kind: 'LEAVE_PROJECT_MEMBER' }))).toBe('/leave-calendar');
    expect(notificationHref(item({ kind: 'DELEGATION_RECEIVED', requestId: null, requestType: null }))).toBe('/approvals?box=delegations');
  });
});
