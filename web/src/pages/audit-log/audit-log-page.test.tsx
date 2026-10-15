import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { ADMIN_ACTOR, AUDIT_RECORDS, DIRECTOR_ACTOR } from '@/test/audit-fixtures';
import { auditApi, auditListStatus } from '@/test/audit-handlers';
import { ADMIN_ACCOUNT, DIRECTOR_ACCOUNT, HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const ADMIN: Account = { ...ADMIN_ACCOUNT, permissions: [...ADMIN_ACCOUNT.permissions, 'AUDIT_VIEW'] };
const DIRECTOR: Account = { ...DIRECTOR_ACCOUNT, permissions: [...DIRECTOR_ACCOUNT.permissions, 'AUDIT_VIEW'] };

const asPhone = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(max-width: 767px)', addEventListener: () => {}, removeEventListener: () => {} }));

const open = (search = '', session: Account = ADMIN, api = auditApi()) => {
  server.use(...api.handlers);
  return { api, ...renderRoutes(routes, { session, path: `/audit-log${search}` }) };
};
const table = async () => {
  const found = await screen.findByRole('table', { name: 'Danh sách bản ghi audit' });
  await waitFor(() => expect(screen.queryByRole('status', { name: 'Đang tải Audit log' })).not.toBeInTheDocument());
  return found;
};
const bodyRows = async () => within(await table()).getAllByRole('row').slice(1);
const summaries = async () => (await bodyRows()).map((row) => within(row).getAllByRole('cell')[4]!.textContent);

describe('AuditLogPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('lists the records newest first with time, person, action, object and summary, and pages through them', async () => {
    const { api } = open('', ADMIN, auditApi(AUDIT_RECORDS, { delayMs: 30 }));
    expect(screen.getByRole('heading', { level: 1, name: 'Audit log' })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Điều hướng chính' })).getByRole('link', { name: 'Audit log' })).toHaveAttribute('aria-current', 'page');
    expect(within(await table()).getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Thời gian', 'Người sửa', 'Thao tác', 'Đối tượng', 'Nội dung']);
    expect(api.requests[0]).toBe('page=0&size=20');

    const [first, , third, , fifth] = await bodyRows();
    expect(within(first!).getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
      '14/10/2026 03:05',
      expect.stringContaining('Phạm Quốc Bảo'),
      'Sửa',
      'Ngưỡng nguồn lực',
      'Resource thresholds restored to the defaults',
    ]);
    // A kind the screen cannot translate keeps the server's label; no Account means the system did it.
    expect(within(third!).getAllByRole('cell')[3]).toHaveTextContent('Bank account');
    expect(within(third!).getAllByRole('cell')[2]).toHaveTextContent('Thêm');
    expect(within(fifth!).getAllByRole('cell')[1]).toHaveTextContent('Hệ thống');
    expect(within(fifth!).getAllByRole('cell')[2]).toHaveTextContent('Xóa');
    expect(screen.getByText('Hiển thị 1–20 trên 23 bản ghi.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Trang sau|Trang tiếp/ }));
    await waitFor(async () => expect(await summaries()).toHaveLength(3));
    expect(api.requests.at(-1)).toBe('page=1&size=20');
    expect(screen.getByText('Hiển thị 21–23 trên 23 bản ghi.')).toBeInTheDocument();
  });

  it('has no control to add, edit or delete a record', async () => {
    open();
    await table();
    const main = screen.getByRole('main');
    expect(within(main).queryByRole('button', { name: /^(Sửa|Xóa|Thêm)/ })).not.toBeInTheDocument();
    expect(within(main).queryByRole('button', { name: /Thao tác|Tùy chọn/ })).not.toBeInTheDocument();
    expect(within(main).queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('filters by object, person, period and search together, keeps them in the URL, and clears them', async () => {
    const { api, router } = open('?from=2026-10-10&to=2026-10-14');
    await table();
    expect(api.requests[0]).toBe('page=0&size=20&from=2026-10-10&to=2026-10-14');
    expect(screen.getByRole('button', { name: /Khoảng thời gian 10\/10\/2026 – 14\/10\/2026/ })).toBeInTheDocument();
    expect(await summaries()).toEqual(['Resource thresholds restored to the defaults', 'Resource thresholds changed', 'Bank account added', 'Resource thresholds changed']);

    await userEvent.click(screen.getByRole('combobox', { name: 'Đối tượng' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Ngưỡng nguồn lực' }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Người sửa' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Phạm Quốc Bảo' }));
    await waitFor(() => expect(api.requests.at(-1)).toBe(`page=0&size=20&entityType=RESOURCE_SETTING&actorId=${DIRECTOR_ACTOR}&from=2026-10-10&to=2026-10-14`));
    expect(await summaries()).toEqual(['Resource thresholds restored to the defaults', 'Resource thresholds changed']);
    expect(router.state.location.search).toBe(`?from=2026-10-10&to=2026-10-14&type=RESOURCE_SETTING&actor=${DIRECTOR_ACTOR}`);

    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm theo nội dung hoặc người sửa' }), 'RESTORED');
    await waitFor(() => expect(api.requests.at(-1)).toContain('q=RESTORED'));
    await waitFor(async () => expect(await summaries()).toEqual(['Resource thresholds restored to the defaults']));

    await userEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
    await waitFor(() => expect(api.requests.at(-1)).toBe('page=0&size=20'));
    expect(router.state.location.search).toBe('');
    expect(screen.getByRole('combobox', { name: 'Đối tượng' })).toHaveTextContent('Mọi đối tượng');
  });

  it('says when nothing matches, with a way back to every record', async () => {
    open(`?actor=${ADMIN_ACTOR}&q=nothing-like-this`);
    expect(await screen.findByRole('heading', { name: 'Không có bản ghi nào khớp “nothing-like-this”' })).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('main')).getAllByRole('button', { name: 'Xóa bộ lọc' }).at(-1)!);
    expect(await summaries()).toHaveLength(20);
  });

  it('says when nothing has been recorded yet', async () => {
    open('', ADMIN, auditApi([]));
    expect(await screen.findByRole('heading', { name: 'Chưa có bản ghi nào' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows the error with a retry that loads the list', async () => {
    server.use(auditListStatus(500, 'error.unknown'));
    const api = auditApi();
    renderRoutes(routes, { session: ADMIN, path: '/audit-log' });
    expect(await screen.findByText('Không tải được Audit log')).toBeInTheDocument();
    server.use(...api.handlers);
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await summaries()).toHaveLength(20);
  });

  it('lets the Giám đốc read the log', async () => {
    open('', DIRECTOR);
    expect(await summaries()).toHaveLength(20);
    expect(within(screen.getByRole('navigation', { name: 'Điều hướng chính' })).getByRole('link', { name: 'Audit log' })).toBeInTheDocument();
  });

  it('without AUDIT_VIEW: no nav item, the denied state by URL, and no request', async () => {
    const { api } = open('', HR_ACCOUNT);
    expect(await screen.findByRole('heading', { name: 'Bạn không xem được Audit log' })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Điều hướng chính' })).queryByRole('link', { name: 'Audit log' })).not.toBeInTheDocument();
    expect(api.requests).toEqual([]);
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
  });

  it('shows the denied state when the API refuses the list', async () => {
    server.use(auditListStatus(403, 'auth.forbidden'));
    renderRoutes(routes, { session: ADMIN, path: '/audit-log' });
    expect(await screen.findByRole('heading', { name: 'Bạn không xem được Audit log' })).toBeInTheDocument();
  });

  it('at 390: compact rows and the filter dialog', async () => {
    asPhone();
    const { api } = open();
    const list = await screen.findByRole('list', { name: 'Danh sách bản ghi audit' });
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(20));
    const first = within(list).getAllByRole('listitem')[0]!;
    expect(first).toHaveTextContent('Resource thresholds restored to the defaults');
    expect(first).toHaveTextContent('Ngưỡng nguồn lực · Phạm Quốc Bảo');
    expect(first).toHaveTextContent('14/10 03:05');

    await userEvent.click(screen.getByRole('button', { name: 'Lọc' }));
    const dialog = await screen.findByRole('dialog', { name: 'Lọc Audit log' });
    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Người sửa' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Đỗ Minh Quân' }));
    await waitFor(() => expect(api.requests.at(-1)).toBe(`page=0&size=20&actorId=${ADMIN_ACTOR}`));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xem 19 bản ghi' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lọc.*1 bộ lọc đang dùng/ })).toBeInTheDocument();
  });

  it('reads in English', async () => {
    await i18n.changeLanguage('en');
    open();
    const rows = await screen.findByRole('table', { name: 'Audit records' });
    await waitFor(() => expect(within(rows).getAllByRole('row')).toHaveLength(21));
    expect(within(rows).getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Time', 'Changed by', 'Action', 'Object', 'Summary']);
    expect(within(rows).getAllByRole('row')[1]).toHaveTextContent('Resource thresholds');
    expect(within(rows).getAllByRole('row')[1]).toHaveTextContent('Edited');
  });
});
