// Leave data as the API returns it (contract on issue #20), drawn from the `#18` artboards: Nguyễn Văn An (Nhóm Web)
// with 4,5 days of Phép năm left (10 accrued, 4 used, 1,5 pending, 2 more in advance), Lê Văn Hùng his approver.
// Dates are relative to the company's today, on weekdays, so the tests hold any day they run.
import { addDays, format, getDay } from 'date-fns';
import type { EmployeeCard } from '@/features/approval/api';
import type { DayPart, LeaveBalanceItem, LeaveBalances, LeaveDay, LeaveRequestDetail, LeaveRequestListItem, LeaveTypeRef } from '@/features/leave/api';
import type { LeavePolicyValues, LeaveTypeItem } from '@/features/leave/policy-api';
import { companyToday } from '@/lib/company-time';
import { HUNG } from './approval-fixtures';
import { detailOf } from './approval-detail-fixtures';

export const AN_ID = '00000000-0000-4000-c000-000000000021';
export const AN: EmployeeCard = { id: AN_ID, code: 'NV00021', fullName: 'Nguyễn Văn An', orgUnitName: 'Nhóm Web' };
export const TRI: EmployeeCard = { id: 'e-31', code: 'NV00031', fullName: 'Cao Minh Trí', orgUnitName: 'Nhóm Web' };
export const LAN: EmployeeCard = { id: 'e-13', code: 'NV00013', fullName: 'Vũ Thị Lan', orgUnitName: 'Phòng Phát triển phần mềm' };
export const YEAR = companyToday().getFullYear();

/** `yyyy-MM-dd` of the first `weekday` (0 Sunday … 6 Saturday) at least `ahead` days from today. */
export function nextWeekday(weekday: number, ahead = 7): string {
  let day = addDays(companyToday(), ahead);
  while (getDay(day) !== weekday) day = addDays(day, 1);
  return format(day, 'yyyy-MM-dd');
}

export const plusDays = (iso: string, days: number) => format(addDays(new Date(`${iso}T00:00:00`), days), 'yyyy-MM-dd');

const policy = (overrides: Partial<LeavePolicyValues>): LeavePolicyValues => ({
  effectiveFrom: '2000-01-01',
  pay: 'COMPANY',
  halfDayAllowed: true,
  attachmentRequired: false,
  limited: false,
  entitlementDays: null,
  seniorityStepYears: null,
  accrual: null,
  cutOffDay: 15,
  advanceAllowed: false,
  maxDaysPerRequest: null,
  carryOverMaxDays: null,
  carryOverExpiry: null,
  ...overrides,
});

const type = (n: number, code: string, name: string, values: Partial<LeavePolicyValues>, active = true): LeaveTypeItem => {
  const p = policy(values);
  return { id: `lt-${n}`, code, name, sortOrder: n, active, policy: p, versions: [p] };
};

export const ANNUAL = type(1, 'PN', 'Phép năm', { limited: true, entitlementDays: 12, seniorityStepYears: 5, accrual: 'MONTHLY', advanceAllowed: true, carryOverMaxDays: 5, carryOverExpiry: '03-31' });
export const SICK = type(2, 'OM', 'Nghỉ ốm', { pay: 'SOCIAL_INSURANCE', attachmentRequired: true });
export const PERSONAL = type(4, 'VR', 'Việc riêng có lương', { halfDayAllowed: false, maxDaysPerRequest: 3 });
export const UNPAID = type(5, 'KL', 'Không lương', { pay: 'UNPAID' });
export const TYPES: LeaveTypeItem[] = [ANNUAL, SICK, PERSONAL, UNPAID];

export const refOf = (t: LeaveTypeItem): LeaveTypeRef => ({ id: t.id, code: t.code, name: t.name, active: t.active });

const unlimited = (t: LeaveTypeItem, used: number, pending = 0): LeaveBalanceItem => ({
  leaveType: refOf(t),
  pay: t.policy!.pay,
  halfDayAllowed: t.policy!.halfDayAllowed,
  attachmentRequired: t.policy!.attachmentRequired,
  balance: { leaveTypeId: t.id, year: YEAR, limited: false, accrued: null, entitled: null, used, pending, remaining: null, advanceAvailable: 0, available: null },
});

/** The balances of the year; `remaining` changes Phép năm (a negative one is advance taken). */
export function balancesOf(remaining = 4.5): LeaveBalances {
  const advance = remaining >= 0 ? 2 : Math.max(0, 2 + remaining);
  return {
    employee: AN,
    year: YEAR,
    asOf: format(companyToday(), 'yyyy-MM-dd'),
    items: [
      {
        leaveType: refOf(ANNUAL),
        pay: 'COMPANY',
        halfDayAllowed: true,
        attachmentRequired: false,
        balance: { leaveTypeId: ANNUAL.id, year: YEAR, limited: true, accrued: 10, entitled: 12, used: 4, pending: 1.5, remaining, advanceAvailable: advance, available: remaining + advance },
      },
      unlimited(SICK, 1),
      unlimited(PERSONAL, 0),
      unlimited(UNPAID, 0),
    ],
  };
}

export const requestId = (n: number) => `00000000-0000-4000-d000-${String(n).padStart(12, '0')}`;

/** The days of a span with weekends off, as the check counts them (no holidays here). */
export function daysOf(start: string, startPart: DayPart, end: string, endPart: DayPart): LeaveDay[] {
  const days: LeaveDay[] = [];
  for (let day = new Date(`${start}T00:00:00`); format(day, 'yyyy-MM-dd') <= end; day = addDays(day, 1)) {
    const date = format(day, 'yyyy-MM-dd');
    const weekend = getDay(day) === 0 || getDay(day) === 6;
    const part = date === start ? startPart : date === end ? endPart : 'FULL';
    const morning = !weekend && part !== 'AFTERNOON';
    const afternoon = !weekend && part !== 'MORNING';
    days.push({ date, kind: weekend ? 'DAY_OFF' : 'WORKING', morning, afternoon, value: (morning ? 0.5 : 0) + (afternoon ? 0.5 : 0), holidayName: null });
  }
  return days;
}

const listItem = (n: number, t: LeaveTypeItem, status: LeaveRequestListItem['status'], start: string, startPart: LeaveRequestListItem['startPart'], end: string, endPart: LeaveRequestListItem['endPart']): LeaveRequestListItem => {
  const days = daysOf(start, startPart, end, endPart).reduce((sum, day) => sum + day.value, 0);
  return { id: requestId(n), status, leaveType: refOf(t), startDate: start, startPart, endDate: end, endPart, days, canCancel: status === 'PENDING' || status === 'RETURNED' || status === 'APPROVED', createdAt: new Date(Date.now() - n * 86_400_000).toISOString() };
};

/** "Đơn của tôi": waiting (Thu afternoon – Fri), approved (one day), returned (one morning). */
export const MINE: LeaveRequestListItem[] = [
  listItem(1, ANNUAL, 'PENDING', nextWeekday(4), 'AFTERNOON', plusDays(nextWeekday(4), 1), 'FULL'),
  listItem(2, ANNUAL, 'APPROVED', nextWeekday(2, 14), 'FULL', nextWeekday(2, 14), 'FULL'),
  listItem(3, ANNUAL, 'RETURNED', nextWeekday(3, 21), 'MORNING', nextWeekday(3, 21), 'MORNING'),
];

/** The request as GET /api/leave-requests/{id} returns it to its sender (or, with `approver`, to Lê Văn Hùng). */
export function detailFor(item: LeaveRequestListItem, approver = false): LeaveRequestDetail {
  const approvalStatus = { PENDING: 'PENDING', RETURNED: 'RETURNED_FOR_INFO', APPROVED: 'APPROVED', REJECTED: 'REJECTED', CANCELLED: 'CANCELLED' } as const;
  const approval = detailOf({
    id: item.id,
    type: 'LEAVE',
    status: approvalStatus[item.status],
    level: 1,
    levelCount: 1,
    rule: 'LINE_MANAGER',
    role: null,
    summary: `${item.leaveType.name}, ${item.days} ngày`,
    sender: AN,
    sentAt: item.createdAt,
    autoApproveDueAt: new Date(Date.now() + 2 * 86_400_000).toISOString(),
    onBehalfOf: null,
    resubmitted: false,
    updatedAt: item.createdAt,
  });
  approval.steps = approval.steps.map((step) => (step.state === 'WAITING' ? { ...step, approvers: [HUNG] } : step.state === 'RETURNED' ? { ...step, comment: 'Ngày đó có họp dự án, đổi sang buổi chiều nhé.' } : step));
  approval.allowed = { ...approval.allowed, decide: approver && item.status === 'PENDING' };
  const balance = balancesOf().items[0]!.balance;
  return {
    ...item,
    employee: AN,
    dayList: daysOf(item.startDate, item.startPart, item.endDate, item.endPart),
    reason: item.status === 'PENDING' ? 'Về quê dự đám cưới' : null,
    cc: item.status === 'PENDING' ? [LAN] : [],
    attachments: [],
    approval,
    balance: item.leaveType.id === ANNUAL.id ? balance : null,
    remainingBefore: item.leaveType.id === ANNUAL.id ? 4.5 + item.days : null,
    remainingAfter: item.leaveType.id === ANNUAL.id ? 4.5 : null,
    unitAbsences: approver ? [{ employee: TRI, leaveType: refOf(ANNUAL), startDate: item.startDate, startPart: 'FULL', endDate: item.startDate, endPart: 'FULL', status: 'APPROVED' }] : [],
    canEdit: !approver && item.status === 'RETURNED',
    canCancel: !approver && item.canCancel,
    updatedAt: item.createdAt,
    cancelledAt: null,
  };
}

/** The leave request behind an approval inbox row of type LEAVE, as its approver reads it. */
export function leaveOfApprovalRow(id: string, sender: EmployeeCard): LeaveRequestDetail {
  return { ...detailFor({ ...MINE[0]!, id }, true), employee: sender };
}
