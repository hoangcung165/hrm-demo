// The selected node of the org tree lives in the URL (`?unit=<id>`), so it survives a reload and can be linked.
import { useEffect, type RefObject } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { ROOT_ID } from './org-tree';

export function useUnitSelection() {
  const [params, setParams] = useSearchParams();
  const searchFor = (id: string) => {
    const next = new URLSearchParams(params);
    if (id === ROOT_ID) next.delete('unit');
    else next.set('unit', id);
    return next;
  };
  return {
    /** Raw id from the URL; the caller falls back to the company node when no unit has it. */
    unitParam: params.get('unit'),
    select: (id: string) => setParams(searchFor(id)),
    /** Props of a `Link` in the detail that selects the node, keeping the other parameters. */
    linkProps: (id: string) => ({ to: { search: searchFor(id).toString() }, state: FROM_DETAIL }),
  };
}

// Router state of a navigation made through a detail link.
const FROM_DETAIL = { focusDetail: true };

/**
 * A detail link unmounts when its unit is selected, and focus would fall to `body`:
 * after such a navigation, focus moves to the heading of the detail card.
 */
export function useFocusAfterDetailLink(heading: RefObject<HTMLElement | null>) {
  const location = useLocation();
  const fromDetail = (location.state as Partial<typeof FROM_DETAIL> | null)?.focusDetail === true;
  useEffect(() => {
    if (fromDetail) heading.current?.focus();
  }, [fromDetail, location.key, heading]);
}
