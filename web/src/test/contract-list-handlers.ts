// HRM-38/FE-1: GET /api/contracts over fixtures, filtering and paging as the API does: the search is a contains over the
// Employee name or code or the contract number with accents ignored, `type` ignores case, the filters combine.
import { http, HttpResponse } from 'msw';
import type { ContractList, ContractListItem } from '@/features/contract/list-api';

export const CONTRACT_AS_OF = '2026-11-01';
export const CONTRACT_EMPLOYEE_ID = '11111111-2222-3333-4444-555555555555';

const plain = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').toLowerCase();

export const contractItem = (n: number, overrides: Partial<ContractListItem> = {}): ContractListItem => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  employeeId: n === 1 ? CONTRACT_EMPLOYEE_ID : `00000000-0000-4000-9000-${String(n).padStart(12, '0')}`,
  employeeCode: `NV${String(n).padStart(5, '0')}`,
  employeeName: `Nhân viên ${n}`,
  contractNumber: `HD-${String(n).padStart(4, '0')}`,
  contractType: 'FIXED_TERM',
  startsOn: '2026-01-16',
  endsOn: '2027-01-15',
  state: 'CURRENT',
  daysRemaining: 75,
  ...overrides,
});

/** One of each state, in the order the API sorts them: running by end date, open-ended, ended last. */
export const CONTRACTS: ContractListItem[] = [
  contractItem(1, { employeeName: 'Nguyễn Văn An', contractNumber: 'HD-0001', startsOn: '2026-02-01', endsOn: '2026-11-21', state: 'EXPIRING', daysRemaining: 20 }),
  contractItem(2, { employeeName: 'Trần Thị Ánh', contractNumber: 'HD-0002', contractType: 'PROBATION', startsOn: '2026-09-01', endsOn: '2027-01-01', state: 'CURRENT', daysRemaining: 61 }),
  contractItem(3, { employeeName: 'Lê Văn Bình', contractNumber: 'HD-0003', startsOn: '2026-12-01', endsOn: '2027-11-30', state: 'UPCOMING', daysRemaining: null }),
  contractItem(4, { employeeName: 'Phạm Thị Cúc', contractNumber: 'HD-0004', contractType: 'INDEFINITE', startsOn: '2024-03-01', endsOn: null, state: 'CURRENT', daysRemaining: null }),
  contractItem(5, { employeeName: 'Đỗ Minh Dũng', contractNumber: 'HD-0005', startsOn: '2025-01-01', endsOn: '2025-12-31', state: 'ENDED', daysRemaining: null }),
];

export type ContractListApiOptions = {
  items?: ContractListItem[];
  /** Answer every call with this status instead of the list. */
  fail?: { status: number };
};

export function contractListApi({ items = CONTRACTS, fail }: ContractListApiOptions = {}) {
  const requests: URL[] = [];
  const handler = http.get('*/api/contracts', ({ request }) => {
    const url = new URL(request.url);
    requests.push(url);
    if (fail) return HttpResponse.json({ code: 'internal', message: 'Down' }, { status: fail.status });
    const search = plain(url.searchParams.get('search') ?? '');
    const type = (url.searchParams.get('type') ?? '').toUpperCase();
    const state = url.searchParams.get('state');
    const matching = items.filter(
      (item) =>
        (!search || [item.employeeName, item.employeeCode, item.contractNumber].some((text) => plain(text).includes(search))) &&
        (!type || item.contractType === type) &&
        (!state || item.state === state),
    );
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 20);
    const body: ContractList = { items: matching.slice(page * size, page * size + size), total: matching.length, page, size, asOf: CONTRACT_AS_OF };
    return HttpResponse.json(body);
  });
  return { requests, handler };
}
