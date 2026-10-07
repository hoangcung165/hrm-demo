// Where the profile is in the URL and how it was reached. The tab lives in `?tab=` (Cá nhân, the default, stays
// out of it). The list hands its own query string over in the location state, so "Nhân viên" goes back to the
// list with the same search, filters and page; a tab change keeps that state.
import { useLocation, useSearchParams } from 'react-router';
import { PROFILE_TABS, type ProfileTab } from './profile-tabs';

/** Location state of a link from the employee list to a profile. */
export type ProfileLinkState = { listSearch?: string };

export function useProfileNavigation() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const state = (location.state ?? null) as ProfileLinkState | null;
  const raw = params.get('tab');
  const tab: ProfileTab = PROFILE_TABS.includes(raw as ProfileTab) ? (raw as ProfileTab) : 'personal';
  return {
    tab,
    setTab: (next: ProfileTab) => setParams(next === 'personal' ? {} : { tab: next }, { state: location.state }),
    /** The list, with the query it had when the profile was opened from it. */
    listHref: `/employees${state?.listSearch ?? ''}`,
  };
}
