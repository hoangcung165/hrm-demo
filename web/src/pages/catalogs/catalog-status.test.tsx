import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import i18n from '@/i18n';
import { catalogApi } from '@/test/catalog-handlers';
import { ADMIN_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';

const open = (search = '') => {
  const api = catalogApi();
  server.use(...api.handlers);
  return { api, ...renderRoutes(routes, { session: ADMIN_ACCOUNT, path: `/catalogs${search}` }) };
};
const table = async (name = 'Chức danh') => {
  const found = await screen.findByRole('table', { name });
  await waitFor(() => expect(screen.queryByRole('status', { name: 'Đang tải danh mục' })).not.toBeInTheDocument());
  return found;
};
const rowOf = async (name: string, list = 'Chức danh') => within(await table(list)).getByText(name).closest('tr')!;
async function openMenu(name: string, list = 'Chức danh') {
  await table(list);
  await userEvent.click(screen.getByRole('button', { name: `Thao tác cho ${name}` }));
  return screen.findByRole('menu');
}
const itemsOf = (menu: HTMLElement) => within(menu).getAllByRole('menuitem').map((item) => item.textContent);

describe('CatalogsPage: deactivate, reactivate and delete', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('offers delete only for an item that is not in use, and says why otherwise', async () => {
    open();
    expect(itemsOf(await openMenu('Giám đốc'))).toEqual(['Sửa', 'Ngừng hoạt động', 'Xóa']);
    await userEvent.keyboard('{Escape}');
    const inUse = await openMenu('Nhân viên');
    expect(itemsOf(inUse)).toEqual(['Sửa', 'Ngừng hoạt động']);
    expect(within(inUse).getByText('Đang được sử dụng: chỉ ngừng hoạt động được, không xóa được.')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(itemsOf(await openMenu('Thực tập sinh'))).toEqual(['Sửa', 'Kích hoạt lại', 'Xóa']);
  });

  it('deactivates at once, and "Hoàn tác" in the toast reactivates', async () => {
    const { api } = open();
    await userEvent.click(within(await openMenu('Giám đốc')).getByRole('menuitem', { name: 'Ngừng hoạt động' }));
    expect(await within(toastRegion()).findByText('Đã ngừng hoạt động Giám đốc')).toBeInTheDocument();
    expect(within(toastRegion()).getByText('Không còn được chọn cho hồ sơ mới; hồ sơ cũ giữ nguyên.')).toBeInTheDocument();
    await waitFor(async () => expect(within(await rowOf('Giám đốc')).getByText('Ngừng hoạt động')).toBeInTheDocument());
    expect(api.writes).toEqual([{ method: 'deactivate', catalog: 'positions', id: api.items.positions[0]!.id }]);

    await userEvent.click(within(toastRegion()).getByRole('button', { name: 'Hoàn tác' }));
    expect(await within(toastRegion()).findByText('Đã kích hoạt lại Giám đốc')).toBeInTheDocument();
    // The undo is done once: its toast is gone.
    expect(within(toastRegion()).queryByText('Đã ngừng hoạt động Giám đốc')).not.toBeInTheDocument();
    await waitFor(async () => expect(within(await rowOf('Giám đốc')).getByText('Đang dùng')).toBeInTheDocument());
    expect(api.writes.at(-1)).toEqual({ method: 'reactivate', catalog: 'positions', id: api.items.positions[0]!.id });
  });

  it('reactivates an inactive item at once', async () => {
    const { api } = open();
    await userEvent.click(within(await openMenu('Thực tập sinh')).getByRole('menuitem', { name: 'Kích hoạt lại' }));
    expect(await within(toastRegion()).findByText('Đã kích hoạt lại Thực tập sinh')).toBeInTheDocument();
    await waitFor(async () => expect(within(await rowOf('Thực tập sinh')).getByText('Đang dùng')).toBeInTheDocument());
    expect(api.writes.map((write) => write.method)).toEqual(['reactivate']);
  });

  it('deletes after a confirm that names the item, and does nothing on cancel', async () => {
    const { api } = open();
    await userEvent.click(within(await openMenu('Phó giám đốc')).getByRole('menuitem', { name: 'Xóa' }));
    const confirm = await screen.findByRole('dialog', { name: 'Xóa Phó giám đốc?' });
    expect(within(confirm).getByText('Mục này sẽ bị xóa khỏi danh mục Chức danh. Không hoàn tác được.')).toBeInTheDocument();
    await userEvent.click(within(confirm).getByRole('button', { name: 'Hủy' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.writes).toEqual([]);

    await userEvent.click(within(await openMenu('Phó giám đốc')).getByRole('menuitem', { name: 'Xóa' }));
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Xóa Phó giám đốc?' })).getByRole('button', { name: 'Xóa' }));
    expect(await within(toastRegion()).findByText('Đã xóa Phó giám đốc')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(async () => expect(within(await table()).queryByText('Phó giám đốc')).not.toBeInTheDocument());
    expect(api.writes.map((write) => write.method)).toEqual(['DELETE']);
  });

  it('says so when the item came into use meanwhile, and the reloaded row offers no delete', async () => {
    const { api } = open('?catalog=contract-types');
    await table('Loại hợp đồng');
    // Since the list was loaded, a contract started to use it.
    api.items['contract-types'].find((item) => item.code === 'TV')!.inUse = true;
    await userEvent.click(within(await openMenu('Hợp đồng thử việc', 'Loại hợp đồng')).getByRole('menuitem', { name: 'Xóa' }));
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Xóa Hợp đồng thử việc?' })).getByRole('button', { name: 'Xóa' }));
    expect(await within(toastRegion()).findByText('Không xóa được Hợp đồng thử việc')).toBeInTheDocument();
    expect(within(toastRegion()).getByText('Đang được sử dụng. Có thể ngừng hoạt động thay vì xóa.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // The failed delete reloaded the list.
    await waitFor(() => expect(api.requests).toHaveLength(2));
    await waitFor(async () => {
      const items = itemsOf(await openMenu('Hợp đồng thử việc', 'Loại hợp đồng'));
      // The reloaded rows may still be on their way: close the menu and look again.
      if (items.length !== 2) await userEvent.keyboard('{Escape}');
      expect(items).toEqual(['Sửa', 'Ngừng hoạt động']);
    });
  });
});
