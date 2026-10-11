// The list has no row: no project yet on this tab (no search, default filters), or nothing matches.
import { Briefcase, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StateBlock } from '@/components/ui/state-block';
import type { ProjectFilters } from '@/features/project/use-project-filters';

export type ProjectListEmptyProps = { filters: ProjectFilters };

export function ProjectListEmpty({ filters }: ProjectListEmptyProps) {
  const { t } = useTranslation();
  const q = filters.query.q;
  if (!filters.filtered) {
    const mine = filters.tab === 'mine';
    return (
      <Card bare>
        <StateBlock
          variant="empty"
          icon={<Briefcase />}
          title={t(mine ? 'projects.emptyMine.title' : 'projects.empty.title')}
          description={t(mine ? 'projects.emptyMine.text' : 'projects.empty.text')}
        />
      </Card>
    );
  }
  return (
    <Card bare>
      <StateBlock
        variant="plain"
        icon={<Search />}
        title={q ? t('projects.noMatch.titleQuery', { query: q }) : t('projects.noMatch.title')}
        description={t('projects.noMatch.text')}
        actions={
          <Button variant="secondary" size="sm" onClick={filters.clear}>
            {t('projects.filter.clear')}
          </Button>
        }
      />
    </Card>
  );
}
