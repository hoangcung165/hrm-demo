import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import { LOCATIONS, locationApi, type LocationApiOptions } from '@/test/checkin-location-handlers';
import { stubDevices, type DeviceOptions } from '@/test/device-stubs';
import { HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

export const HR: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'ATTENDANCE_LOCATION_EDIT'] };
export const OTHER: Account = { ...HR_ACCOUNT, roles: ['DIRECTOR'], permissions: [...HR_ACCOUNT.permissions, 'ATTENDANCE_VIEW'] };

/** Opens `/attendance-locations` over a copy of the example places. */
export function open(session: Account = HR, options: LocationApiOptions & { places?: typeof LOCATIONS } = {}, devices?: DeviceOptions) {
  const api = locationApi(options.places ?? LOCATIONS, options);
  server.use(...api.handlers);
  const device = devices ? stubDevices(devices) : null;
  return { api, device, ...renderRoutes(routes, { session, path: '/attendance-locations' }) };
}

export const table = () => screen.findByRole('table', { name: 'Danh sách địa điểm chấm công' });
/** The row whose name cell reads `name` (a row has no name of its own). */
export const rowOf = async (name: string) => (await screen.findByRole('cell', { name })).closest('tr') as HTMLElement;
export const asPhone = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(max-width: 767px)', addEventListener: () => {}, removeEventListener: () => {} }));

/** Types each value into the field of that label, clearing it first. */
export async function fill(dialog: HTMLElement, user: ReturnType<typeof userEvent.setup>, values: Record<string, string>) {
  for (const [label, value] of Object.entries(values)) {
    const field = within(dialog).getByLabelText(new RegExp(`^${label}`));
    await user.clear(field);
    if (value) await user.type(field, value);
  }
}
