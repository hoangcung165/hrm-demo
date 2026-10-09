// MSW handlers for the Excel files of Employees ("## API contract" on issue #9): the export of the list and the
// import template. A file is a few bytes with a zip header, named by `Content-Disposition` and counted by
// `X-Total-Count`, as the backend sends them.
import { delay, http, HttpResponse } from 'msw';
import { problem } from './auth-handlers';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const sheet = (fileName: string, total: number) =>
  new HttpResponse(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), {
    headers: { 'Content-Type': XLSX, 'Content-Disposition': `attachment; filename="${fileName}"`, 'X-Total-Count': String(total), 'Cache-Control': 'no-store' },
  });

export type ExcelApi = {
  handler: ReturnType<typeof http.get>;
  /** The query string of every request, in order. */
  requests: string[];
};

type Answer = { total?: number; fileName?: string; delayMs?: number; fail?: 'network' | 'server' | 'tooManyRows' };

export function employeeExportApi({ total = 24, fileName = 'nhan-vien-2026-10-08.xlsx', delayMs = 0, fail }: Answer = {}): ExcelApi {
  const requests: string[] = [];
  const handler = http.get('*/api/employees/export', async ({ request }) => {
    requests.push(new URL(request.url).searchParams.toString());
    await delay(delayMs);
    if (fail === 'network') return HttpResponse.error();
    if (fail === 'server') return problem(500, 'internal');
    if (fail === 'tooManyRows') return problem(400, 'export.too_many_rows', { limit: 5000, total: 5230 });
    return sheet(fileName, total);
  });
  return { handler, requests };
}

export function importTemplateApi({ delayMs = 0, fail }: Answer = {}): ExcelApi {
  const requests: string[] = [];
  const handler = http.get('*/api/employees/import/template', async ({ request }) => {
    requests.push(new URL(request.url).searchParams.toString());
    await delay(delayMs);
    if (fail === 'network') return HttpResponse.error();
    if (fail) return problem(500, 'internal');
    return sheet('mau-nhap-nhan-vien.xlsx', 0);
  });
  return { handler, requests };
}
