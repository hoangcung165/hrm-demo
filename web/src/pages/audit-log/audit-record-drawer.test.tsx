import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { auditId } from '@/test/audit-fixtures';
import { auditApi, auditRecordFails } from '@/test/audit-handlers';
import { ADMIN_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const ADMIN: Account = { ...ADMIN_ACCOUNT, permissions: [...ADMIN_ACCOUNT.permissions, 'AUDIT_VIEW'] };

const open = (api = auditApi()) => {
  server.use(...api.handlers);
  return { api, ...renderRoutes(routes, { session: ADMIN, path: '/audit-log' }) };
};
/** The newest record with that summary. */
const summaryButton = async (name: string) => {
  const table = await screen.findByRole('table', { name: 'Danh sách bản ghi audit' });
  return (await within(table).findAllByRole('button', { name }))[0]!;
};
const drawer = () => screen.findByRole('dialog', { name: /./ });
const changes = async () => {
  const found = await within(await drawer()).findByRole('table', { name: 'Thay đổi' });
  return within(found)
    .getAllByRole('row')
    .slice(1)
    .map((row) => [within(row).getByRole('rowheader').textContent, ...within(row).getAllByRole('cell').map((cell) => cell.textContent)].filter((text) => text !== ''));
};

describe('Audit record drawer', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('a click on the row opens the record: who, when, and each changed field before → after', async () => {
    const { api } = open();
    await summaryButton('Resource thresholds restored to the defaults');
    const row = screen.getAllByRole('row').find((each) => each.textContent?.includes('restored to the defaults'))!;
    await userEvent.click(within(row).getAllByRole('cell')[0]!);

    const panel = await drawer();
    expect(panel).toHaveAccessibleName('Resource thresholds restored to the defaults');
    expect(panel).toHaveTextContent('Bản ghi audit');
    expect(panel).toHaveTextContent('14/10/2026 03:05 · Phạm Quốc Bảo');
    expect(panel).toHaveTextContent('Đối tượngNgưỡng nguồn lực');
    expect(await changes()).toEqual([
      ['Ngưỡng Bench (%)', '40', '50'],
      ['Mức gần đầy (%)', '85', '90'],
      ['Sắp hết dự án (tuần)', '6', '4'],
    ]);
    expect(api.opened).toEqual([auditId(1)]);
    // Read only here too.
    expect(within(panel).getAllByRole('button').map((button) => button.getAttribute('aria-label') ?? button.textContent)).toEqual(['Đóng']);
    expect(panel).toHaveTextContent('Bản ghi audit chỉ để xem');
  });

  it('Enter on a summary opens it; Esc closes and gives focus back to it', async () => {
    const user = userEvent.setup();
    open();
    const opener = await summaryButton('Resource thresholds changed');
    opener.focus();
    await user.keyboard('{Enter}');
    const panel = await drawer();
    await waitFor(() => expect(panel).toHaveFocus());
    expect(opener).toBeInTheDocument();
    expect(await changes()).toEqual([['Mức gần đầy (%)', '90', '85']]);

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });

  it('a CREATE has no before, a DELETE no after, and a masked field shows it changed without its value', async () => {
    open();
    await userEvent.click(await summaryButton('Bank account added'));
    expect(await changes()).toEqual([
      ['bankName', '—', 'Ngân hàng Mẫu'],
      ['accountNumber', '—', 'Đã ẩn'],
      ['primary', '—', 'Có'],
    ]);
    await userEvent.click(within(await drawer()).getByRole('button', { name: 'Đóng' }));

    await userEvent.click(await summaryButton('Old setting removed'));
    expect(await drawer()).toHaveTextContent('Hệ thống');
    expect(await changes()).toEqual([['Ngưỡng Bench (%)', '45', '—']]);
  });

  it('says when the values cannot be loaded and retries', async () => {
    const api = auditApi();
    // The failing record handler goes first, so it wins over the fixture one.
    server.use(auditRecordFails(), ...api.handlers);
    renderRoutes(routes, { session: ADMIN, path: '/audit-log' });
    await userEvent.click(await summaryButton('Resource thresholds restored to the defaults'));
    expect(await within(await drawer()).findByText('Không tải được giá trị trước và sau')).toBeInTheDocument();
    server.use(...api.handlers);
    await userEvent.click(within(await drawer()).getByRole('button', { name: 'Thử lại' }));
    expect(await changes()).toHaveLength(3);
  });
});
