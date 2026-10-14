// The heatmap without rows: nobody matches the search and filters, or the company has no active Employee yet.
import { SearchX, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StateBlock } from '@/components/ui/state-block';
import type { HeatmapFilters } from '@/features/resource/use-heatmap-filters';

export type HeatmapEmptyProps = { filters: HeatmapFilters };

export function HeatmapEmpty({ filters }: HeatmapEmptyProps) {
  const { t } = useTranslation();
  return (
    <Card bare>
      {filters.filtered ? (
        <StateBlock
          variant="plain"
          icon={<SearchX />}
          title={t('resources.heatmap.noMatch.title')}
          description={t('resources.heatmap.noMatch.text')}
          actions={
            <Button variant="secondary" size="sm" onClick={filters.clear}>
              {t('resources.filter.clear')}
            </Button>
          }
        />
      ) : (
        <StateBlock variant="empty" icon={<Users />} title={t('resources.heatmap.noPeople.title')} description={t('resources.heatmap.noPeople.text')} />
      )}
    </Card>
  );
}
