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

/** GET /api/accounts over the fixture Accounts: `q`, `role`, `status`, `page` and `size` as the backend applies them. */
export function accountListApi(accounts: AccountRow[] = ACCOUNTS, { delayMs = 0 }: { delayMs?: number } = {}): AccountListApi {
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
