import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Suspense, use, useState } from 'react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { useAccountFilters } from './use-account-filters';

// The router changes the location inside a React transition. A render of the new location can be thrown away and
// started again (here: it suspends), and renders of the old location can happen in between. The hook must come
// through that: this is what lost the search text on a busy page (PR #108).
const gate = { blocked: false, open: () => {}, wait: Promise.resolve() };
function blockLocationsWith(text: string) {
  gate.blocked = true;
  gate.wait = new Promise<void>((resolve) => {
    gate.open = () => {
      gate.blocked = false;
      resolve();
    };
  });
  return text;
}
let blockedText = '';

/** Suspends while the gate is closed and the location being rendered holds the blocked text. */
function Gate() {
  const { search } = useLocation();
  if (gate.blocked && decodeURIComponent(search.replaceAll('+', ' ')).includes(blockedText)) use(gate.wait);
  return null;
}

function Harness() {
  const filters = useAccountFilters();
  const [ticks, setTicks] = useState(0);
  return (
    <>
      <input aria-label="search" value={filters.search} onChange={(event) => filters.setSearch(event.target.value)} />
      <button type="button" onClick={() => filters.setRole('HR')}>
        role
      </button>
      <button type="button" onClick={() => filters.setStatus('LOCKED')}>
        status
      </button>
      <button type="button" onClick={() => setTicks(ticks + 1)}>
        tick {ticks}
      </button>
      <output>{JSON.stringify(filters.query)}</output>
      <Gate />
    </>
  );
}

function mount(path: string) {
  const router = createMemoryRouter([{ path: '/', element: <Suspense><Harness /></Suspense> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}
/** Opens the gate, so React can finish the render of the URL it was holding back. */
async function letTheUrlRender() {
  await act(async () => {
    gate.open();
    await gate.wait;
  });
  // A click flushes whatever React still has pending.
  await userEvent.click(screen.getByRole('button', { name: /tick/ }));
}
const box = () => screen.getByRole('textbox', { name: 'search' });
const search = (router: ReturnType<typeof mount>) => router.state.location.search;

describe('useAccountFilters', () => {
  afterEach(() => gate.open());

  it('keeps the typed search when the render of its URL is thrown away and the old URL renders again', async () => {
    const router = mount('/?q=mai');
    expect(box()).toHaveValue('mai');
    blockedText = blockLocationsWith('mai lan');
    await userEvent.type(box(), ' lan');
    // The router has the new URL; React could not finish rendering it, so the page still shows the old one.
    await waitFor(() => expect(search(router)).toBe('?q=mai+lan'));
    expect(screen.getByRole('status')).toHaveTextContent('"q":"mai"');
    // Something else re-renders the page (data arriving, a control opening) with the old URL.
    await userEvent.click(screen.getByRole('button', { name: /tick/ }));
    expect(screen.getByRole('button', { name: 'tick 1' })).toBeInTheDocument();
    expect(box()).toHaveValue('mai lan');
    // A filter chosen now builds on the search that is on its way, not on the old URL.
    await userEvent.click(screen.getByRole('button', { name: 'role' }));
    await waitFor(() => expect(search(router)).toBe('?q=mai+lan&role=HR'));
    await letTheUrlRender();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('"q":"mai lan","role":"HR"'));
    expect(box()).toHaveValue('mai lan');
    // And later writes still build on the whole URL.
    await userEvent.click(screen.getByRole('button', { name: 'status' }));
    await waitFor(() => expect(search(router)).toBe('?q=mai+lan&role=HR&status=LOCKED'));
    expect(box()).toHaveValue('mai lan');
  });

  it('keeps a filter when a second one is chosen before the URL of the first is rendered', async () => {
    const router = mount('/?q=congty');
    blockedText = blockLocationsWith('role=HR');
    await userEvent.click(screen.getByRole('button', { name: 'role' }));
    await waitFor(() => expect(search(router)).toBe('?q=congty&role=HR'));
    expect(screen.getByRole('status')).toHaveTextContent('"role":""');
    await userEvent.click(screen.getByRole('button', { name: /tick/ }));
    await userEvent.click(screen.getByRole('button', { name: 'status' }));
    await waitFor(() => expect(search(router)).toBe('?q=congty&role=HR&status=LOCKED'));
    await letTheUrlRender();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('"q":"congty","role":"HR","status":"LOCKED"'));
    expect(box()).toHaveValue('congty');
  });

  it('follows a URL that changes from outside', async () => {
    const router = mount('/?q=mai&page=3');
    expect(screen.getByRole('status')).toHaveTextContent('"page":2,"q":"mai"');
    await act(() => router.navigate('/?q=lan&status=LOCKED'));
    await waitFor(() => expect(box()).toHaveValue('lan'));
    await userEvent.type(box(), ' ngo');
    await waitFor(() => expect(search(router)).toBe('?q=lan+ngo&status=LOCKED'));
    expect(box()).toHaveValue('lan ngo');
  });
});
