// The list has no row: the company has no contract in this scope yet, or nothing matches the search and filters.
import { FileText, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StateBlock } from '@/components/ui/state-block';
import type { ContractListFilters } from '@/features/contract/use-contract-list-filters';

export type ContractListEmptyProps = { filters: ContractListFilters };

export function ContractListEmpty({ filters }: ContractListEmptyProps) {
  const { t } = useTranslation();
  if (!filters.filtered) {
    return (
      <Card bare>
        <StateBlock variant="empty" icon={<FileText />} title={t('contractList.empty.title')} description={t('contractList.empty.text')} />
      </Card>
    );
  }
  return (
    <Card bare>
      <StateBlock
        variant="plain"
        icon={<Search />}
        title={t('contractList.noMatch.title')}
        description={t('contractList.noMatch.text')}
        actions={
          <Button variant="secondary" size="sm" onClick={filters.clear}>
            {t('contractList.filter.clear')}
          </Button>
        }
      />
    </Card>
  );
}
