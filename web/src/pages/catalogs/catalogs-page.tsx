// Danh mục (HRM-05): one tab per catalog, the tab in `?catalog=`. Every signed-in Account reads the catalogs;
// without CATALOG_EDIT the page says it is read-only (adding and editing come with the next slices).
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { Alert } from '@/components/ui/alert';
import { Tabs } from '@/components/ui/tabs';
import { useCurrentAccount } from '@/features/auth/account-context';
import { CATALOGS, type CatalogKey } from '@/features/catalog/api';
import { CatalogListSection } from './catalog-list-section';

export function CatalogsPage() {
  const { t } = useTranslation();
  const canEdit = useCurrentAccount().permissions.includes('CATALOG_EDIT');
  const [params, setParams] = useSearchParams();
  const raw = params.get('catalog');
  const catalog: CatalogKey = CATALOGS.includes(raw as CatalogKey) ? (raw as CatalogKey) : 'positions';
  // Each tab starts clean: search, status, year and page do not follow to the other tab.
  const setCatalog = (next: CatalogKey) => setParams(next === 'positions' ? {} : { catalog: next });
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="min-w-0 flex-1 text-title">{t('catalogs.title')}</h1>
      </div>
      {canEdit ? null : (
        <Alert variant="info" title={t('catalogs.readOnly.title')}>
          {t('catalogs.readOnly.text')}
        </Alert>
      )}
      <Tabs
        label={t('catalogs.tabs')}
        tabs={CATALOGS.map((key) => ({ id: key, label: t(`catalogs.tab.${key}`) }))}
        active={catalog}
        onChange={setCatalog}
        panelClassName="pt-4"
        scrollable
      >
        {/* Keyed by catalog: the search box and the list start fresh on each tab. */}
        <CatalogListSection key={catalog} catalog={catalog} />
      </Tabs>
    </div>
  );
}
