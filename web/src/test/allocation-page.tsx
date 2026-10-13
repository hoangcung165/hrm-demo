// Shared by the allocation tests: the project page of DA-031 with its members and the allocation endpoints.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import { allocationWriteApi } from '@/test/allocation-handlers';
import { catalogApi } from '@/test/catalog-handlers';
import { orgUnitOptionsOk } from '@/test/org-unit-handlers';
import { DA031_CURRENT, DA031_ENDED, LAN_EMPLOYEE_ID, projectDetail } from '@/test/project-fixtures';
import { allocationsApi, projectDetailOk, projectListApi } from '@/test/project-handlers';
import { HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

export const PM: Account = {
  ...HR_ACCOUNT,
  fullName: 'Vũ Thị Lan',
  roles: ['PROJECT_MANAGER', 'EMPLOYEE'],
  dataScope: 'SELF',
  permissions: ['COMPANY_VIEW', 'ACCOUNT_VIEW', 'PROJECT_VIEW', 'PROJECT_EDIT'],
  employeeId: LAN_EMPLOYEE_ID,
};
export const HR: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'PROJECT_VIEW'] };

/** The project page with the members of the artboard, and the allocation endpoints. */
export function serve({ session = PM, project = projectDetail('DA-031'), members = DA031_CURRENT, write = allocationWriteApi() } = {}) {
  server.use(projectDetailOk([project]), allocationsApi(members, DA031_ENDED).handler, projectListApi().handler, orgUnitOptionsOk(), ...catalogApi().handlers, ...write.handlers);
  return { write, ...renderRoutes(routes, { session, path: `/projects/${project.id}` }) };
}

export const rowOf = async (name: string) => {
  const table = await screen.findByRole('table', { name: 'Phân bổ của dự án Ứng dụng đặt lịch khám' });
  return (await within(table).findByText(name)).closest('tr')!;
};

export const openRowMenu = async (name: string) => {
  const row = await rowOf(name);
  await userEvent.click(within(row).getByRole('button', { name: `Thao tác với phân bổ của ${name}` }));
  return screen.findByRole('menu');
};

/** Opens the row menu of `name` and picks `item`; the menu closes. */
export async function openMenuAndPick(name: string, item: string) {
  const menu = await openRowMenu(name);
  await userEvent.click(within(menu).getByRole('menuitem', { name: item }));
}
