// Toolbar of the unit tree: search, the inactive toggle and collapse/expand all.
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import type { useOrgTreeView } from '../use-org-tree-view';

export type OrgTreeToolbarProps = { view: ReturnType<typeof useOrgTreeView> };

export function OrgTreeToolbar({ view }: OrgTreeToolbarProps) {
  const { t } = useTranslation();
  const query = view.query.trim();
  // Announced once typing pauses, so a screen reader does not read a result per keystroke.
  const settled = useDebouncedValue(query, 500) === query;
  const result = view.matchCount > 0 ? t('org.tree.found', { count: view.matchCount }) : t('org.tree.noMatch.title', { query });
  return (
    <>
      <span role="status" className="sr-only">
        {query && settled ? result : ''}
      </span>
      <Input
        type="search"
        aria-label={t('org.tree.search')}
        placeholder={t('org.tree.searchPlaceholder')}
        value={view.query}
        onChange={(event) => view.setQuery(event.target.value)}
        leading={<Search aria-hidden="true" />}
        wrapperClassName="h-11 min-w-0 flex-1 basis-full md:h-10 md:basis-0"
        className="[&::-webkit-search-cancel-button]:hidden"
        trailing={
          view.query ? (
            <button
              type="button"
              aria-label={t('org.tree.clearSearch')}
              onClick={() => view.setQuery('')}
              className="-mr-3 grid size-11 shrink-0 md:-mr-2 md:size-8 cursor-pointer place-items-center rounded-sm text-ink-muted hover:bg-surface-muted [&_svg]:size-4 [&_svg]:stroke-[1.5]"
            >
              <X aria-hidden="true" />
            </button>
          ) : null
        }
      />
      <Checkbox
        checked={view.showInactive}
        onChange={(event) => view.setShowInactive(event.target.checked)}
        className="min-h-11 flex-1 md:min-h-0 md:flex-none"
      >
        {t('org.tree.showInactive')}
      </Checkbox>
      {view.canCollapse ? (
        <Button variant="ghost" size="sm" className="h-11 shrink-0 md:h-8" onClick={view.allCollapsed ? view.expandAll : view.collapseAll}>
          {t(view.allCollapsed ? 'org.tree.expandAll' : 'org.tree.collapseAll')}
        </Button>
      ) : null}
    </>
  );
}
