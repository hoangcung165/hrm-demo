import { useEffect } from 'react';
import { addDays } from 'date-fns';
import { CalendarClock, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Card } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { ErrorState } from '@/components/ui/error-state';
import { Select } from '@/components/ui/select';
import { StateBlock } from '@/components/ui/state-block';
import { useCurrentAccount } from '@/features/auth/account-context';
import { EXPIRY_PAGE_SIZE, EXPIRY_TYPES, useUpcomingExpiries, type UpcomingExpiryItem } from '@/features/expiry/api';
import { useExpiryFilters } from '@/features/expiry/use-expiry-filters';
import { ApiError } from '@/lib/api';
import { companyToday } from '@/lib/company-time';
import { formatDate, formatNumber, toIsoDate } from '@/lib/format';
import { useMediaQuery } from '@/lib/use-media-query';

function ExpiryDenied() {
  const { t } = useTranslation();
  return <Card bare><StateBlock variant="denied" title={t('expiry.denied.title')} description={t('expiry.denied.text')} actions={<Link to="/" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>{t('expiry.denied.home')}</Link>} /></Card>;
}

export function ExpiryListSection() {
  const { t } = useTranslation();
  const { permissions } = useCurrentAccount();
  const allowed = permissions.includes('EMPLOYEE_VIEW') && permissions.includes('EMPLOYEE_SENSITIVE_VIEW');
  const compact = useMediaQuery('(max-width: 767px)');
  const today = companyToday();
  const minDay = toIsoDate(today);
  const maxDay = toIsoDate(addDays(today, 365));
  const filters = useExpiryFilters();
  const result = useUpcomingExpiries(filters.query, allowed);
  const data = result.data;
  const lastPage = Math.max(0, Math.ceil((data?.total ?? 0) / EXPIRY_PAGE_SIZE) - 1);
  const pastEnd = Boolean(data) && !result.isPlaceholderData && filters.query.page > lastPage;
  useEffect(() => { if (pastEnd) filters.setPage(lastPage, true); }, [pastEnd, lastPage]);

  const columns: Array<DataTableColumn<UpcomingExpiryItem>> = [
    { id: 'employee', header: t('expiry.col.employee'), skeleton: 'person', className: 'w-56', cell: (row) => <span className="flex flex-col"><span className="font-medium">{row.employeeName}</span><span className="text-caption text-ink-muted">{row.employeeCode}</span></span> },
    { id: 'type', header: t('expiry.col.type'), className: 'w-40', cell: (row) => t(`expiry.type.${row.type}`) },
    { id: 'source', header: t('expiry.col.source'), cell: (row) => <Link className="font-medium text-brand-blue underline-offset-2 hover:underline" to={row.sourcePath} aria-label={t('expiry.openSource', { source: row.sourceName || t(`expiry.type.${row.type}`), employee: row.employeeName })}>{row.sourceName || t(`expiry.type.${row.type}`)}</Link> },
    { id: 'date', header: t('expiry.col.date'), className: 'w-36', cell: (row) => <time dateTime={row.expiresOn} className="tabular-nums">{formatDate(row.expiresOn)}</time> },
    { id: 'remaining', header: t('expiry.col.remaining'), className: 'w-32', numeric: true, cell: (row) => t('expiry.days', { count: row.daysRemaining }) },
  ];
  const denied = !allowed || (result.error instanceof ApiError && result.error.status === 403);
  const empty = !result.isError && data?.total === 0;

  return (
    <div className="flex flex-col gap-4">
      {denied ? <ExpiryDenied /> : <>
        <div role="search" aria-label={t('expiry.filter.label')} className="flex flex-wrap items-end gap-3">
          <div className="min-w-40 flex-1 sm:max-w-56"><label htmlFor="expiry-type" className="mb-1 block text-body-small font-medium">{t('expiry.filter.type')}</label><Select id="expiry-type" value={filters.query.type} onChange={(value) => filters.setType(value === 'ALL' ? '' : value)} placeholder={t('expiry.filter.allTypes')} options={[{ value: 'ALL', label: t('expiry.filter.allTypes') }, ...EXPIRY_TYPES.map((value) => ({ value, label: t(`expiry.type.${value}`) }))]} /></div>
          <div className="min-w-36 flex-1 sm:max-w-48"><label htmlFor="expiry-from" className="mb-1 block text-body-small font-medium">{t('expiry.filter.from')}</label><input id="expiry-from" type="date" min={minDay} max={maxDay} value={filters.query.from} onChange={(event) => filters.setDates(event.target.value, filters.query.to)} className="h-10 w-full rounded-sm border border-line bg-surface px-3 focus-visible:shadow-focus-ring" /></div>
          <div className="min-w-36 flex-1 sm:max-w-48"><label htmlFor="expiry-to" className="mb-1 block text-body-small font-medium">{t('expiry.filter.to')}</label><input id="expiry-to" type="date" min={minDay} max={maxDay} value={filters.query.to} onChange={(event) => filters.setDates(filters.query.from, event.target.value)} className="h-10 w-full rounded-sm border border-line bg-surface px-3 focus-visible:shadow-focus-ring" /></div>
          {filters.filtered && <Button variant="ghost" size="sm" onClick={filters.clear}>{t('expiry.filter.clear')}</Button>}
        </div>
        <div role="status">{empty ? <Card bare><StateBlock variant={filters.filtered ? 'plain' : 'empty'} icon={filters.filtered ? <Search /> : <CalendarClock />} title={t(filters.filtered ? 'expiry.noMatch.title' : 'expiry.empty.title')} description={t(filters.filtered ? 'expiry.noMatch.text' : 'expiry.empty.text')} actions={filters.filtered ? <Button variant="secondary" size="sm" onClick={filters.clear}>{t('expiry.filter.clear')}</Button> : undefined} /></Card> : null}</div>
        {result.isError ? <Card bare><ErrorState title={t('expiry.loadError')} onRetry={() => void result.refetch()} /></Card> : empty ? null : <DataTable caption={t('expiry.list')} columns={columns} data={data?.items ?? []} rowKey={(row) => `${row.type}-${row.sourceId}`} pageSize={EXPIRY_PAGE_SIZE} pageIndex={data?.page ?? 0} total={data?.total ?? 0} onPageChange={filters.setPage} loading={!data} loadingLabel={t('expiry.loading')} busy={result.isPlaceholderData} variant={compact ? 'compact' : 'default'} summary={({ from, to, total }) => t('expiry.pagination', { from: formatNumber(from), to: formatNumber(to), total: formatNumber(total) })} rows={{ lead: (row) => <Link to={row.sourcePath} className="font-medium text-brand-blue">{row.employeeName} · {row.sourceName || t(`expiry.type.${row.type}`)}</Link>, meta: (row) => t(`expiry.type.${row.type}`), metaLabel: t('expiry.col.type'), end: (row) => <span className="text-caption tabular-nums">{formatDate(row.expiresOn)} · {t('expiry.days', { count: row.daysRemaining })}</span>, endLabel: t('expiry.col.date') }} />}
      </>}
    </div>
  );
}
