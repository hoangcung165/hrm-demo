import { useUrlListQuery } from '@/lib/use-url-list-query';
import { addDays, isValid, parseISO } from 'date-fns';
import { companyToday } from '@/lib/company-time';
import { toIsoDate } from '@/lib/format';
import { EXPIRY_TYPES, type ExpiryQuery, type ExpiryType } from './api';

const FILTERS = ['type', 'from', 'to'] as const;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const validDay = (value: string | null) => {
  const today = companyToday();
  const first = toIsoDate(today);
  const last = toIsoDate(addDays(today, 365));
  return value && DAY.test(value) && isValid(parseISO(value)) && toIsoDate(parseISO(value)) === value && value >= first && value <= last ? value : '';
};

export function useExpiryFilters() {
  const list = useUrlListQuery(FILTERS);
  const rawType = list.params.get('type');
  const type: ExpiryType | '' = EXPIRY_TYPES.find((item) => item === rawType) ?? '';
  const from = validDay(list.params.get('from'));
  const to = validDay(list.params.get('to'));
  // A reversed URL must never send an invalid range to the API.
  const query: ExpiryQuery = { type, from: from && to && to < from ? to : from, to: from && to && to < from ? from : to, page: Math.min(list.pageIndex, 10_000) };
  return {
    query,
    filtered: Boolean(type || from || to),
    setType: (value: string) => list.setFilter('type', value),
    setDates: (start: string, end: string) => list.setFilters(start && end && end < start ? { from: end, to: start } : { from: start, to: end }),
    setPage: list.setPage,
    clear: list.clear,
  };
}
