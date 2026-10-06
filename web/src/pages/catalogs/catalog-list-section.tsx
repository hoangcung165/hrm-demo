// One catalog tab: the filter bar and the list with its loading, empty, no-match and error states (pattern P10).
import { List, Plus, Search } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { StateBlock } from '@/components/ui/state-block';
import { CATALOG_PAGE_SIZE, useCatalogItems, useHolidayYears, type CatalogKey } from '@/features/catalog/api';
import { useCatalogActions } from '@/features/catalog/catalog-actions-context';
import { CatalogFilterBar } from '@/features/catalog/components/catalog-filter-bar';
import { CatalogTable } from '@/features/catalog/components/catalog-table';
import { useCatalogFilters } from '@/features/catalog/use-catalog-filters';

export type CatalogListSectionProps = { catalog: CatalogKey };

export function CatalogListSection({ catalog }: CatalogListSectionProps) {
  const { t } = useTranslation();
  const actions = useCatalogActions();
  const filters = useCatalogFilters(catalog);
  const items = useCatalogItems(catalog, filters.query);
  const years = useHolidayYears(catalog === 'holidays');
  const { data } = items;
  // A page past the end (a stale link, or rows that went away): go to the last page that has rows.
  const lastPage = data ? Math.max(0, Math.ceil(data.total / CATALOG_PAGE_SIZE) - 1) : 0;
  const pastEnd = Boolean(data) && !items.isPlaceholderData && filters.query.page > lastPage;
  const { setPage } = filters;
  useEffect(() => {
    if (pastEnd) setPage(lastPage, true);
    // `setPage` is new on every render.
  }, [pastEnd, lastPage]);

  const noun = t(`catalogs.noun.${catalog}`);
  const q = filters.query.q;
  const empty = !items.isError && data?.total === 0;
  // With no search and no status the catalog itself is empty (for holidays: in that year).
  const catalogEmpty = empty && !q && !filters.query.status;
  return (
    <div className="flex flex-col gap-4">
      <CatalogFilterBar catalog={catalog} filters={filters} years={years.data} disabled={items.isPending} />
      <div>
        {/* Always in the page, so a search that ends with nothing is announced. */}
        <div role="status">
          {empty ? (
            <Card bare>
              {catalogEmpty ? (
                <StateBlock
                  variant="empty"
                  icon={<List />}
                  title={catalog === 'holidays' ? t('catalogs.empty.titleYear', { noun, year: filters.query.year }) : t('catalogs.empty.title', { noun })}
                  description={t(`catalogs.empty.text.${catalog}`)}
                  actions={
                    actions ? (
                      <Button size="sm" onClick={actions.openAdd}>
                        <Plus aria-hidden="true" />
                        {t('catalogs.add', { noun: t(`catalogs.one.${catalog}`) })}
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <StateBlock
                  variant="plain"
                  icon={<Search />}
                  title={q ? t('catalogs.noMatch.titleQuery', { noun, query: q }) : t('catalogs.noMatch.title', { noun })}
                  description={t(catalog === 'holidays' ? 'catalogs.noMatch.textName' : 'catalogs.noMatch.text')}
                  actions={
                    <Button variant="secondary" size="sm" onClick={filters.clear}>
                      {t('catalogs.filter.clear')}
                    </Button>
                  }
                />
              )}
            </Card>
          ) : null}
        </div>
        {items.isError ? (
          <Card bare>
            <ErrorState title={t('catalogs.loadError')} onRetry={() => void items.refetch()} />
          </Card>
        ) : empty ? null : (
          <CatalogTable catalog={catalog} rows={data?.items ?? []} total={data?.total ?? 0} pageIndex={data?.pageIndex ?? 0} onPageChange={(page) => filters.setPage(page)} loading={!data} />
        )}
      </div>
    </div>
  );
}
