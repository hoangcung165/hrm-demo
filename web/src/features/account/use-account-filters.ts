// Search, filters and page of the Account list live in the URL (`q`, `role`, `status`, `page`), so they survive a
// reload and can be linked. The search box is local while typing and reaches the URL 300 ms after the last key.
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ROLES, type Role } from '@/features/auth/account';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { ACCOUNT_STATUSES, type AccountListQuery, type AccountStatus } from './api';

const SEARCH_DELAY_MS = 300;
/** The API refuses a longer `q`. */
export const SEARCH_MAX_LENGTH = 100;

const oneOf = <T extends string>(values: readonly T[], value: string | null): T | '' => (values.includes(value as T) ? (value as T) : '');

const readSearch = (params: URLSearchParams) => (params.get('q') ?? '').trim().slice(0, SEARCH_MAX_LENGTH);

export function useAccountFilters() {
  const [params, setParams] = useSearchParams();
  const q = readSearch(params);
  const role = oneOf<Role>(ROLES, params.get('role'));
  const status = oneOf<AccountStatus>(ACCOUNT_STATUSES, params.get('status'));
  // 1-based in the URL, as people count pages.
  const pageNumber = Math.max(1, Math.floor(Number(params.get('page'))) || 1);

  const [search, setSearch] = useState(q);
  // The router changes the location inside a React transition: a render of the new URL can be thrown away and run
  // again, and renders of the old URL can come in between. So nothing below is decided while rendering. The refs
  // change only in event handlers and effects, and the URL is compared only once a location is committed.
  /** The last `q` this hook knows of: its own write, or a URL that came from outside. */
  const known = useRef(q);
  /** The URL this hook is heading for: the committed one, plus its own writes the router has not answered yet. */
  const target = useRef(params.toString());
  /** Those writes, oldest first. */
  const own = useRef<string[]>([]);

  /** Writes filters to the URL; an empty value drops its parameter. Any change but the page itself goes back to page 1. */
  const write = (changes: Partial<Record<'q' | 'role' | 'status' | 'page', string>>, replace = false) => {
    // Built on `target`, not on the URL of this render: a write that follows another before the router has answered
    // (the role chosen while the search is still settling) must not drop the first one.
    const next = new URLSearchParams(target.current);
    if (!('page' in changes)) next.delete('page');
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    // A write that changes nothing gets no answer from the router: it is not waited for.
    if (next.toString() === target.current) return;
    target.current = next.toString();
    own.current.push(target.current);
    setParams(next, { replace });
  };

  const committed = params.toString();
  useEffect(() => {
    const landed = own.current.lastIndexOf(committed);
    if (landed >= 0) {
      // One of this hook's writes arrived; later ones may still be on their way, and `target` already holds them.
      own.current = own.current.slice(landed + 1);
      return;
    }
    // Changed from outside (Back, a link): the hook starts from this URL, and the box follows it.
    own.current = [];
    target.current = committed;
    const outside = readSearch(new URLSearchParams(committed));
    if (outside !== known.current) {
      known.current = outside;
      setSearch(outside);
    }
  }, [committed]);

  const settled = useDebouncedValue(search, SEARCH_DELAY_MS).trim();
  useEffect(() => {
    if (settled === known.current) return;
    known.current = settled;
    // Typing replaces the history entry, so Back leaves the page instead of undoing letters.
    write({ q: settled }, true);
    // Only when typing has paused; `write` is new on every render.
  }, [settled]);

  const query: AccountListQuery = { page: pageNumber - 1, q, role, status };
  return {
    query,
    search,
    setSearch,
    setRole: (value: Role | '') => write({ role: value }),
    setStatus: (value: AccountStatus | '') => write({ status: value }),
    setPage: (pageIndex: number, replace = false) => write({ page: pageIndex > 0 ? String(pageIndex + 1) : '' }, replace),
    filtered: Boolean(q || role || status || search.trim()),
    clear: () => {
      known.current = '';
      setSearch('');
      write({ q: '', role: '', status: '' });
    },
  };
}
