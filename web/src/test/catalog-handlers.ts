// MSW handlers for the catalogs ("## API contract" on issue #7), over fixture items as the backend serves them:
// search on name or code without accents, status, holiday year, paging, ordered by name (holidays by date).
import { delay, http, HttpResponse, type HttpHandler } from 'msw';
import type { CatalogItem, CatalogKey } from '@/features/catalog/api';
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

export type CatalogApi = {
  handlers: HttpHandler[];
  /** `{catalog}?{query}` of every list request, in order. */
  requests: string[];
};

export function catalogApi(source: Record<CatalogKey, CatalogItem[]> = CATALOG_ITEMS, { delayMs = 0 }: { delayMs?: number } = {}): CatalogApi {
  const requests: string[] = [];
  const handlers = [
    http.get('*/api/catalogs/holidays/years', () => {
      const years = new Set<number>();
      for (const holiday of source.holidays) {
        for (let year = Number(holiday.startDate!.slice(0, 4)); year <= Number(holiday.endDate!.slice(0, 4)); year++) years.add(year);
      }
      return HttpResponse.json({ years: [...years].sort() });
    }),
    http.get('*/api/catalogs/:catalog/items', async ({ params, request }) => {
      const catalog = params.catalog as CatalogKey;
      const search = new URL(request.url).searchParams;
      requests.push(`${catalog}?${search}`);
      await delay(delayMs);
      if (!(catalog in source)) return problem(404, 'catalog.not_found');
      const page = Number(search.get('page') ?? 0);
      const size = Number(search.get('size') ?? 20);
      const q = plain(search.get('q') ?? '');
      const status = search.get('status');
      const year = search.get('year');
      const matching = source[catalog]
        .filter(
          (each) =>
            (!q || plain(each.name).includes(q) || (each.code ?? '').toLowerCase().includes(q)) &&
            (!status || each.active === (status === 'ACTIVE')) &&
            (!year || (each.startDate! <= `${year}-12-31` && each.endDate! >= `${year}-01-01`)),
        )
        .sort((a, b) => (catalog === 'holidays' ? a.startDate!.localeCompare(b.startDate!) : plain(a.name).localeCompare(plain(b.name))));
      return HttpResponse.json({ items: matching.slice(page * size, (page + 1) * size), total: matching.length });
    }),
  ];
  return { handlers, requests };
}

export const catalogsFail = () => http.get('*/api/catalogs/:catalog/items', () => problem(500, 'error.unknown'));
