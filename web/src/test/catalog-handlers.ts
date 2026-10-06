// MSW handlers for the catalogs ("## API contract" on issue #7), over fixture items as the backend serves them:
// search on name or code without accents, status, holiday year, paging, ordered by name (holidays by date);
// add and edit with the backend's conflicts (code, name, overlapping holidays).
import { delay, http, HttpResponse, type HttpHandler } from 'msw';
import type { CatalogItem, CatalogItemRequest, CatalogKey } from '@/features/catalog/api';
import { problem } from './auth-handlers';

let next = 0;
const item = (fields: Partial<CatalogItem> & Pick<CatalogItem, 'name'>): CatalogItem => ({
  id: `00000000-0000-4000-a000-${String((next += 1)).padStart(12, '0')}`,
  code: null,
  active: true,
  inUse: false,
  term: null,
  maxMonths: null,
  insurable: null,
  taxable: null,
  startDate: null,
  endDate: null,
  createdAt: '2026-10-06T07:00:00Z',
  updatedAt: '2026-10-06T07:00:00Z',
  ...fields,
});

export const CATALOG_ITEMS: Record<CatalogKey, CatalogItem[]> = {
  positions: [
    item({ code: 'GD', name: 'Giám đốc' }),
    item({ code: 'PGD', name: 'Phó giám đốc' }),
    item({ code: 'TP', name: 'Trưởng phòng' }),
    item({ code: 'NV', name: 'Nhân viên' }),
    item({ code: 'TTS', name: 'Thực tập sinh', active: false }),
  ],
  'contract-types': [
    item({ code: 'KXDTH', name: 'HĐLĐ không xác định thời hạn', term: 'INDEFINITE' }),
    item({ code: 'XDTH', name: 'HĐLĐ xác định thời hạn', term: 'FIXED', maxMonths: 36 }),
    item({ code: 'TV', name: 'Hợp đồng thử việc', term: 'PROBATION' }),
  ],
  'allowance-types': [
    item({ code: 'AN_TRUA', name: 'Phụ cấp ăn trưa', insurable: false, taxable: true }),
    item({ code: 'CHUC_VU', name: 'Phụ cấp chức vụ', insurable: true, taxable: true }),
  ],
  holidays: [
    item({ name: 'Tết Dương lịch', startDate: '2026-01-01', endDate: '2026-01-01' }),
    item({ name: 'Tết Nguyên đán', startDate: '2026-02-16', endDate: '2026-02-20' }),
    item({ name: 'Quốc khánh', startDate: '2026-09-01', endDate: '2026-09-02' }),
    item({ name: 'Tết Dương lịch 2027', startDate: '2027-01-01', endDate: '2027-01-01' }),
  ],
  skills: [],
  'project-roles': [item({ code: 'QA', name: 'Kiểm thử viên' }), item({ code: 'DEV', name: 'Lập trình viên' })],
};

/** Lower case, without Vietnamese accents, as the backend's SearchText. */
const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();

export type CatalogWrite = { method: 'POST' | 'PUT'; catalog: CatalogKey; id?: string; body: CatalogItemRequest };

export type CatalogApi = {
  handlers: HttpHandler[];
  /** `{catalog}?{query}` of every list request, in order. */
  requests: string[];
  /** Every add and edit, in order. */
  writes: CatalogWrite[];
  /** The items as the handlers hold them now (a copy of the fixture, changed by the writes). */
  items: Record<CatalogKey, CatalogItem[]>;
};

/** The backend's conflicts, `self` being the edited item. */
function conflict(items: CatalogItem[], body: CatalogItemRequest, self?: CatalogItem) {
  const others = items.filter((other) => other !== self);
  if (body.code && others.some((other) => other.code === body.code)) return problem(409, 'catalog.code_taken');
  const holder = others.find((other) => plain(other.name) === plain(body.name));
  if (holder) return problem(409, 'catalog.name_taken', { holderName: holder.name });
  const overlap = body.startDate && body.endDate ? others.find((other) => other.startDate! <= body.endDate! && other.endDate! >= body.startDate!) : undefined;
  if (overlap) return problem(409, 'catalog.holiday_overlap', { holidayName: overlap.name, holidayStartDate: overlap.startDate, holidayEndDate: overlap.endDate });
  return null;
}

export function catalogApi(source: Record<CatalogKey, CatalogItem[]> = CATALOG_ITEMS, { delayMs = 0 }: { delayMs?: number } = {}): CatalogApi {
  const requests: string[] = [];
  const writes: CatalogWrite[] = [];
  // Writes change a copy: the fixture stays the same for the next test.
  const items = Object.fromEntries(Object.entries(source).map(([key, list]) => [key, list.map((each) => ({ ...each }))])) as Record<CatalogKey, CatalogItem[]>;
  const handlers = [
    http.get('*/api/catalogs/holidays/years', () => {
      const years = new Set<number>();
      for (const holiday of items.holidays) {
        for (let year = Number(holiday.startDate!.slice(0, 4)); year <= Number(holiday.endDate!.slice(0, 4)); year++) years.add(year);
      }
      return HttpResponse.json({ years: [...years].sort() });
    }),
    http.get('*/api/catalogs/:catalog/items', async ({ params, request }) => {
      const catalog = params.catalog as CatalogKey;
      const search = new URL(request.url).searchParams;
      requests.push(`${catalog}?${search}`);
      await delay(delayMs);
      if (!(catalog in items)) return problem(404, 'catalog.not_found');
      const page = Number(search.get('page') ?? 0);
      const size = Number(search.get('size') ?? 20);
      const q = plain(search.get('q') ?? '');
      const status = search.get('status');
      const year = search.get('year');
      const matching = items[catalog]
        .filter(
          (each) =>
            (!q || plain(each.name).includes(q) || (each.code ?? '').toLowerCase().includes(q)) &&
            (!status || each.active === (status === 'ACTIVE')) &&
            (!year || (each.startDate! <= `${year}-12-31` && each.endDate! >= `${year}-01-01`)),
        )
        .sort((a, b) => (catalog === 'holidays' ? a.startDate!.localeCompare(b.startDate!) : plain(a.name).localeCompare(plain(b.name))));
      return HttpResponse.json({ items: matching.slice(page * size, (page + 1) * size), total: matching.length });
    }),
    http.post('*/api/catalogs/:catalog/items', async ({ params, request }) => {
      const catalog = params.catalog as CatalogKey;
      const body = (await request.json()) as CatalogItemRequest;
      writes.push({ method: 'POST', catalog, body });
      await delay(delayMs);
      const refused = conflict(items[catalog], body);
      if (refused) return refused;
      const added = item({ ...body, createdAt: '2026-10-06T08:00:00Z', updatedAt: '2026-10-06T08:00:00Z' });
      items[catalog].push(added);
      return HttpResponse.json(added, { status: 201 });
    }),
    http.put('*/api/catalogs/:catalog/items/:id', async ({ params, request }) => {
      const catalog = params.catalog as CatalogKey;
      const id = String(params.id);
      const body = (await request.json()) as CatalogItemRequest;
      writes.push({ method: 'PUT', catalog, id, body });
      await delay(delayMs);
      const found = items[catalog].find((each) => each.id === id);
      if (!found) return problem(404, 'catalog.not_found');
      const refused = conflict(items[catalog], body, found);
      if (refused) return refused;
      Object.assign(found, body, { updatedAt: '2026-10-06T08:00:00Z' });
      return HttpResponse.json(found);
    }),
  ];
  return { handlers, requests, writes, items };
}

export const catalogsFail = () => http.get('*/api/catalogs/:catalog/items', () => problem(500, 'error.unknown'));
