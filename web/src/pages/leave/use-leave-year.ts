// The year "Nghỉ phép" shows, and the page of "Đơn của tôi", in the URL (`?year=2026&page=2`); this year by default.
import { useSearchParams } from 'react-router';
import { companyToday } from '@/lib/company-time';

export type LeaveYear = {
  value: number;
  /** Last year, this year and next year: requests may be sent ahead. */
  options: number[];
  setYear: (year: number) => void;
  /** Zero-based. */
  page: number;
  setPage: (page: number) => void;
};

export function useLeaveYear(): LeaveYear {
  const [params, setParams] = useSearchParams();
  const current = companyToday().getFullYear();
  const asked = Number(params.get('year'));
  const value = Number.isInteger(asked) && asked >= 2000 && asked <= 9999 ? asked : current;
  const page = Math.max(0, Number(params.get('page')) - 1 || 0);
  const update = (year: number, nextPage: number) => {
    const next = new URLSearchParams(params);
    if (year === current) next.delete('year');
    else next.set('year', String(year));
    if (nextPage > 0) next.set('page', String(nextPage + 1));
    else next.delete('page');
    setParams(next, { replace: true });
  };
  return {
    value,
    options: [current - 1, current, current + 1],
    setYear: (year) => update(year, 0),
    page,
    setPage: (nextPage) => update(value, nextPage),
  };
}
