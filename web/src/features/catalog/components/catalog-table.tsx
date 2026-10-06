// A catalog list: a table with the columns of its catalog, or compact two-line rows below 768px, paged by the
// server. Read-only (the row menu comes with the edit slices).
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { daysInRange, formatDateRange, formatNumber } from '@/lib/format';
import { useMediaQuery } from '@/lib/use-media-query';
import { CATALOG_PAGE_SIZE, type CatalogItem, type CatalogKey } from '../api';
import { CatalogStatusBadge } from './catalog-status-badge';

export type CatalogTableProps = {
  catalog: CatalogKey;
  /** The rows of the current page; ignored while `loading`. */
  rows: CatalogItem[];
  total: number;
  /** Zero-based. */
  pageIndex: number;
  onPageChange: (pageIndex: number) => void;
  loading?: boolean;
};

const dates = (item: CatalogItem) => (item.startDate && item.endDate ? formatDateRange(item.startDate, item.endDate) : '');

export function CatalogTable({ catalog, rows, total, pageIndex, onPageChange, loading = false }: CatalogTableProps) {
  const { t } = useTranslation();
  const compact = useMediaQuery('(max-width: 767px)');

  const columns = useMemo<Array<DataTableColumn<CatalogItem>>>(() => {
    const yesNo = (value: boolean | null) =>
      value ? <span className="font-medium text-success">{t('catalogs.yes')}</span> : <span className="text-ink-muted">{t('catalogs.no')}</span>;
    const term = (item: CatalogItem) => (item.term ? t(`catalogs.term.${item.term}`, { months: item.maxMonths }) : '');
    const code: DataTableColumn<CatalogItem> = { id: 'code', header: t('catalogs.col.code'), className: 'w-40', cell: (item) => <span className="tabular-nums">{item.code}</span> };
    const name: DataTableColumn<CatalogItem> = { id: 'name', header: t('catalogs.col.name'), cell: (item) => <span className="font-medium">{item.name}</span> };
    const status: DataTableColumn<CatalogItem> = { id: 'status', header: t('catalogs.col.status'), className: 'w-45', cell: (item) => <CatalogStatusBadge active={item.active} /> };
    switch (catalog) {
      case 'contract-types':
        return [code, name, { id: 'term', header: t('catalogs.col.term'), className: 'w-90', cell: term }, status];
      case 'allowance-types':
        return [
          code,
          name,
          { id: 'insurable', header: t('catalogs.col.insurable'), className: 'w-40', cell: (item) => yesNo(item.insurable) },
          { id: 'taxable', header: t('catalogs.col.taxable'), className: 'w-40', cell: (item) => yesNo(item.taxable) },
          status,
        ];
      case 'holidays':
        return [
          { id: 'dates', header: t('catalogs.col.dates'), className: 'w-55', cell: (item) => <span className="tabular-nums">{dates(item)}</span> },
          {
            id: 'days',
            header: t('catalogs.col.days'),
            numeric: true,
            className: 'w-30',
            cell: (item) => (item.startDate && item.endDate ? formatNumber(daysInRange(item.startDate, item.endDate)) : ''),
          },
          name,
          status,
        ];
      default:
        return [code, name, status];
    }
  }, [t, catalog]);

  // At 390 line two carries the code (or the dates) and, for contract types, the term.
  const meta = (item: CatalogItem) => {
    if (catalog === 'holidays') return <span className="text-caption text-ink-muted tabular-nums">{dates(item)}</span>;
    const term = catalog === 'contract-types' && item.term ? ` · ${t(`catalogs.term.${item.term}`, { months: item.maxMonths })}` : '';
    return (
      <span className="text-caption text-ink-muted">
        <span className="tabular-nums">{item.code}</span>
        {term}
      </span>
    );
  };

  return (
    <DataTable
      caption={t(`catalogs.tab.${catalog}`)}
      columns={columns}
      data={loading ? [] : rows}
      rowKey={(item) => item.id}
      pageSize={CATALOG_PAGE_SIZE}
      pageIndex={pageIndex}
      total={total}
      onPageChange={onPageChange}
      summary={(range) =>
        t('catalogs.pagination', { from: formatNumber(range.from), to: formatNumber(range.to), total: formatNumber(range.total), noun: t(`catalogs.noun.${catalog}`) })
      }
      loading={loading}
      loadingLabel={t('catalogs.loading')}
      variant={compact ? 'compact' : 'default'}
      rows={{
        lead: (item) => <span className="font-medium">{item.name}</span>,
        meta,
        metaLabel: t(catalog === 'holidays' ? 'catalogs.col.dates' : 'catalogs.col.code'),
        end: (item) => <CatalogStatusBadge active={item.active} />,
        endLabel: t('catalogs.col.status'),
      }}
    />
  );
}
