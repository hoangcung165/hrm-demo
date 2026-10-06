// Search, filters and page of a server-paged list kept in the URL (`q`, the filters, `page`), so they survive a
// reload and can be linked. The search box is local while typing and reaches the URL 300 ms after the last key.
// Parameters this hook does not know (e.g. the tab, `?view=` or `?catalog=`) are kept as they are.
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useDebouncedValue } from './use-debounced-value';

const SEARCH_DELAY_MS = 300;
/** The APIs refuse a longer `q`. */
export const SEARCH_MAX_LENGTH = 100;

const readSearch = (params: URLSearchParams) => (params.get('q') ?? '').trim().slice(0, SEARCH_MAX_LENGTH);

/** `filterKeys`: the URL parameters of the list's filters besides `q` and `page`. */
export function useUrlListQuery<F extends string>(filterKeys: readonly F[]) {
  const [params, setParams] = useSearchParams();
  const q = readSearch(params);
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

  /** Writes to the URL; an empty value drops its parameter. Any change but the page itself goes back to page 1. */
  const write = (changes: Partial<Record<F | 'q' | 'page', string>>, replace = false) => {
    // Built on `target`, not on the URL of this render: a write that follows another before the router has answered
    // (a filter chosen while the search is still settling) must not drop the first one.
    const next = new URLSearchParams(target.current);
    if (!('page' in changes)) next.delete('page');
    for (const [key, value] of Object.entries(changes) as Array<[string, string | undefined]>) {
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
    // Changed from outside (Back, a link, a tab): the hook starts from this URL, and the box follows it.
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
    write({ q: settled } as Partial<Record<F | 'q' | 'page', string>>, true);
    // Only when typing has paused; `write` is new on every render.
  }, [settled]);

  return {
    params,
    q,
    pageIndex: pageNumber - 1,
    search,
    setSearch,
    /** Sets one filter; back to page 1. */
    setFilter: (key: F, value: string) => write({ [key]: value } as Partial<Record<F | 'q' | 'page', string>>),
    setPage: (pageIndex: number, replace = false) =>
      write({ page: pageIndex > 0 ? String(pageIndex + 1) : '' } as Partial<Record<F | 'q' | 'page', string>>, replace),
    /** A search or any filter is set, or being typed. */
    filtered: Boolean(q || search.trim() || filterKeys.some((key) => params.get(key))),
    clear: () => {
      known.current = '';
      setSearch('');
      write(Object.fromEntries([['q', ''], ...filterKeys.map((key) => [key, ''])]) as Partial<Record<F | 'q' | 'page', string>>);
    },
  };
}
