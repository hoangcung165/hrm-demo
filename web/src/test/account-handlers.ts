// MSW handlers for the Account list ("## API contract" on issue #6).
import { delay, http, HttpResponse } from 'msw';
import type { AccountRow } from '@/features/account/api';
import { ACCOUNTS } from './account-fixtures';
import { problem } from './auth-handlers';

/** Lower case, without Vietnamese accents, as the backend matches `q`. */
const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();

export type AccountListApi = {
  handler: ReturnType<typeof http.get>;
  /** The query string of every list request, in order, e.g. "page=0&size=20&q=tran". */
  requests: string[];
};

/** GET /api/accounts over the fixture Accounts (or the rows a function gives at each request): `q`, `role`, `status`, `page` and `size` as the backend applies them. */
export function accountListApi(source: AccountRow[] | (() => AccountRow[]) = ACCOUNTS, { delayMs = 0 }: { delayMs?: number } = {}): AccountListApi {
  const requests: string[] = [];
  const handler = http.get('*/api/accounts', async ({ request }) => {
    const search = new URL(request.url).searchParams;
    requests.push(search.toString());
    await delay(delayMs);
    const page = Number(search.get('page') ?? 0);
    const size = Number(search.get('size') ?? 20);
    const q = plain(search.get('q') ?? '');
    const role = search.get('role');
    const status = search.get('status');
    if (page < 0 || size < 1 || q.length > 100) return problem(400, 'validation.invalid');
    const accounts = typeof source === 'function' ? source() : source;
    const matching = accounts.filter(
      (account) =>
        (!q || plain(account.fullName).includes(q) || plain(account.email).includes(q)) &&
        (!role || account.roles.includes(role as AccountRow['roles'][number])) &&
        (!status || account.status === status),
    );
    return HttpResponse.json({ items: matching.slice(page * size, (page + 1) * size), total: matching.length });
  });
  return { handler, requests };
}

export const accountsDenied = () => http.get('*/api/accounts', () => problem(403, 'auth.forbidden'));
export const accountsFail = () => http.get('*/api/accounts', () => problem(500, 'error.unknown'));

export type AccountApi = {
  handlers: ReturnType<typeof http.get>[];
  /** The query string of every list request, in order. */
  requests: string[];
  /** Bodies of the POST and PUT calls, in order; an edit has the `id`. */
  writes: { method: 'POST' | 'PUT'; id?: string; body: Record<string, unknown> }[];
  current: () => AccountRow[];
};

const ROLE_NAMES = ['ADMIN', 'HR', 'LINE_MANAGER', 'PROJECT_MANAGER', 'ACCOUNTANT', 'DIRECTOR', 'EMPLOYEE'];
const WIDE = ['ADMIN', 'HR', 'ACCOUNTANT', 'DIRECTOR'];
const scopeOf = (roles: string[]): AccountRow['dataScope'] => (roles.some((role) => WIDE.includes(role)) ? 'COMPANY' : roles.includes('LINE_MANAGER') ? 'ORG_UNIT' : 'SELF');

/** GET, POST and PUT over one in-memory copy of the Accounts, validating like the backend does (`AccountAdminService`). */
export function accountApi(initial: AccountRow[] = ACCOUNTS, { delayMs = 0 }: { delayMs?: number } = {}): AccountApi {
  let accounts: AccountRow[] = structuredClone(initial);
  const writes: AccountApi['writes'] = [];
  // The list as the backend sorts it: by full name without accents.
  const list = accountListApi(() => [...accounts].sort((a, b) => plain(a.fullName).localeCompare(plain(b.fullName))), { delayMs });

  // The cleaned-up values of a request, or the problem the backend would answer with.
  const check = (body: Record<string, unknown>, self?: AccountRow) => {
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const roles = Array.isArray(body.roles) ? (body.roles as string[]) : [];
    const errors = [];
    if (!fullName) errors.push({ field: 'fullName', code: 'NotBlank' });
    else if (fullName.length > 100) errors.push({ field: 'fullName', code: 'Size' });
    if (!email) errors.push({ field: 'email', code: 'NotBlank' });
    else if (!/^[^@\s]+@[^@\s]+$/.test(email)) errors.push({ field: 'email', code: 'Email' });
    if (roles.length === 0) errors.push({ field: 'roles', code: 'NotEmpty' });
    if (!self) {
      const password = typeof body.password === 'string' ? body.password : '';
      if (!password.trim()) errors.push({ field: 'password', code: 'NotBlank' });
      else if (password.length < 8 || password.length > 72) errors.push({ field: 'password', code: 'Size' });
    }
    if (errors.length > 0) return { problem: problem(400, 'validation.invalid', { errors }) };
    if (!roles.every((role) => ROLE_NAMES.includes(role))) return { problem: problem(400, 'validation.invalid', { errors: [{ field: 'roles', code: 'Invalid' }] }) };
    const holder = accounts.find((account) => account.email === email && account !== self);
    if (holder) return { problem: problem(409, 'account.email_taken', { holder: { id: holder.id, fullName: holder.fullName } }) };
    if (body.employeeId != null) return { problem: problem(400, 'account.employee_not_found') };
    return { fullName, email, roles: roles as AccountRow['roles'] };
  };

  const handlers = [
    list.handler,
    http.post('*/api/accounts', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      writes.push({ method: 'POST', body });
      await delay(delayMs);
      const checked = check(body);
      if (checked.problem) return checked.problem;
      const account: AccountRow = {
        id: `00000000-0000-4000-b000-${String(accounts.length + 1).padStart(12, '0')}`,
        email: checked.email,
        fullName: checked.fullName,
        roles: checked.roles,
        dataScope: scopeOf(checked.roles),
        status: 'ACTIVE',
        employee: null,
        demoPersona: null,
        createdAt: '2026-10-05T02:00:00Z',
      };
      accounts.push(account);
      return HttpResponse.json(account, { status: 201 });
    }),
    http.put('*/api/accounts/:id', async ({ request, params }) => {
      const body = (await request.json()) as Record<string, unknown>;
      const id = String(params.id);
      writes.push({ method: 'PUT', id, body });
      await delay(delayMs);
      const account = accounts.find((candidate) => candidate.id === id);
      if (!account) return problem(404, 'account.not_found');
      if (account.demoPersona) return problem(409, 'account.demo_persona_not_editable');
      const checked = check(body, account);
      if (checked.problem) return checked.problem;
      const realAdmins = accounts.filter((candidate) => candidate.roles.includes('ADMIN') && candidate.status === 'ACTIVE' && !candidate.demoPersona);
      if (account.roles.includes('ADMIN') && !checked.roles.includes('ADMIN') && account.status === 'ACTIVE' && realAdmins.length <= 1) return problem(409, 'account.last_admin');
      Object.assign(account, { fullName: checked.fullName, email: checked.email, roles: checked.roles, dataScope: scopeOf(checked.roles) });
      return HttpResponse.json(account);
    }),
  ];
  return { handlers, requests: list.requests, writes, current: () => accounts };
}
