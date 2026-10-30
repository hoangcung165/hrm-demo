// MSW handlers for the "Nghỉ hôm nay" and "Sắp hết hạn" blocks of Tổng quan (HRM-20): the leave of the day and the
// first rows of the expiry list, over fixture people.
import { http, HttpResponse } from 'msw';
import type { LeaveToday } from '@/features/dashboard/leave-today-api';
import type { UpcomingExpiries, UpcomingExpiryItem } from '@/features/expiry/api';
import { problem } from './auth-handlers';

const person = (n: number, fullName: string, orgUnitName: string) => ({ id: `e-${n}`, code: `NV${String(n).padStart(4, '0')}`, fullName, orgUnitName });
const type = (code: string, name: string) => ({ id: `lt-${code}`, code, name, active: true });

/** Four on leave on 2026-10-30: a whole day, a long request, a morning and an afternoon. */
export const LEAVE_TODAY: LeaveToday = {
  date: '2026-10-30',
  entries: [
    { requestId: 'r1', employee: person(1, 'Hồ Sỹ Quang', 'Chi nhánh Đà Nẵng'), leaveType: type('PN', 'Phép năm'), part: 'FULL', until: '2026-11-03' },
    { requestId: 'r2', employee: person(2, 'Lâm Thị Kim Oanh', 'Phòng Tài chính - Kế toán'), leaveType: type('OM', 'Nghỉ ốm'), part: 'FULL', until: '2026-10-30' },
    { requestId: 'r3', employee: person(3, 'Thái Văn Bình', 'Nhóm Hỗ trợ khách hàng'), leaveType: type('PN', 'Phép năm'), part: 'AFTERNOON', until: '2026-10-30' },
    { requestId: 'r4', employee: person(4, 'Tống Thị Yến', 'Nhóm Marketing'), leaveType: type('TS', 'Thai sản'), part: 'FULL', until: '2027-03-02' },
  ],
};
export const LEAVE_MORNING: LeaveToday = { date: '2026-10-30', entries: [{ ...LEAVE_TODAY.entries[2]!, requestId: 'r5', part: 'MORNING' }] };

const expiry = (type: UpcomingExpiryItem['type'], n: number, employeeName: string, sourceName: string | null, expiresOn: string, daysRemaining: number): UpcomingExpiryItem => ({
  type, sourceId: `s-${n}`, employeeId: `e-${n}`, employeeCode: `NV${String(n).padStart(4, '0')}`, employeeName, sourceName, expiresOn, daysRemaining, sourcePath: `/employees/e-${n}?tab=contracts`,
});

/** Five rows of `total` 12, soonest first: probation, contract, visa, a certificate and one that expires today. */
export const EXPIRIES: UpcomingExpiries = {
  asOf: '2026-10-30', page: 0, size: 5, total: 12,
  items: [
    expiry('CONTRACT', 1, 'Trần Thị Mai', 'HĐLĐ xác định thời hạn', '2026-10-30', 0),
    expiry('PROBATION', 2, 'Phan Khánh Duy', null, '2026-11-02', 3),
    expiry('VISA', 3, 'Phạm Thị Lan Anh', null, '2026-11-13', 14),
    expiry('CERTIFICATE', 4, 'Lưu Đức Mạnh', 'Chứng chỉ AWS Solutions Architect', '2026-11-28', 29),
    expiry('CONTRACT', 5, 'Nguyễn Văn An', 'HĐLĐ xác định thời hạn', '2026-11-30', 31),
  ],
};

export type AttentionApi = {
  handlers: ReturnType<typeof http.get>[];
  /** The query string of every expiry request. */
  expiryRequests: string[];
};

export function attentionApi(leave: LeaveToday = LEAVE_TODAY, expiries: UpcomingExpiries = EXPIRIES): AttentionApi {
  const expiryRequests: string[] = [];
  return {
    expiryRequests,
    handlers: [
      http.get('*/api/dashboard/leave-today', () => HttpResponse.json(leave)),
      http.get('*/api/expiry', ({ request }) => {
        expiryRequests.push(new URL(request.url).searchParams.toString());
        return HttpResponse.json(expiries);
      }),
    ],
  };
}

/** What a signed-in Account gets by default: nobody on leave and nothing expiring. */
export const leaveTodayEmpty = () => http.get('*/api/dashboard/leave-today', () => HttpResponse.json({ date: '2026-10-30', entries: [] } satisfies LeaveToday));
export const expiryEmpty = () => http.get('*/api/expiry', () => HttpResponse.json({ items: [], total: 0, page: 0, size: 5, asOf: '2026-10-30' } satisfies UpcomingExpiries));
export const leaveTodayFail = () => http.get('*/api/dashboard/leave-today', () => problem(500, 'error.unknown'));
export const expiryFail = () => http.get('*/api/expiry', () => problem(500, 'error.unknown'));
