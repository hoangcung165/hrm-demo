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

export function useAccountFilters() {
  const [params, setParams] = useSearchParams();
  const q = (params.get('q') ?? '').trim().slice(0, SEARCH_MAX_LENGTH);
  const role = oneOf<Role>(ROLES, params.get('role'));
  const status = oneOf<AccountStatus>(ACCOUNT_STATUSES, params.get('status'));
  // 1-based in the URL, as people count pages.
  const pageNumber = Math.max(1, Math.floor(Number(params.get('page'))) || 1);

  const [search, setSearch] = useState(q);
  // The last `q` this hook knows of: its own write, or the URL as it was read.
  const known = useRef(q);
  // The URL this hook is heading for, and its own writes the router has not answered yet. A write that follows
  // another before the router has rendered again (the role chosen while the search is still settling) builds on
  // the first one instead of dropping it.
  const seen = useRef(params);
  const latest = useRef(params);
  const own = useRef<string[]>([]);
  if (seen.current !== params) {
    seen.current = params;
    const landed = own.current.indexOf(params.toString());
    if (landed >= 0) {
      // One of this hook's writes arrived; later ones may still be on their way, and `latest` already holds them.
      own.current = own.current.slice(landed + 1);
      if (own.current.length === 0) latest.current = params;
    } else {
      // Changed from outside (Back, a link, the other tab): the box follows the URL.
      own.current = [];
      latest.current = params;
      if (q !== known.current) {
        known.current = q;
        setSearch(q);
      }
    }
  }
  /** Writes filters to the URL; an empty value drops its parameter. Any change but the page itself goes back to page 1. */
  const write = (changes: Partial<Record<'q' | 'role' | 'status' | 'page', string>>, replace = false) => {
    const next = new URLSearchParams(latest.current);
    if (!('page' in changes)) next.delete('page');
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    // A write that changes nothing gets no answer from the router: it is not waited for.
    if (next.toString() !== latest.current.toString()) own.current.push(next.toString());
    latest.current = next;
    setParams(next, { replace });
  };

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
