// Over the contract list: search, contract type and state, and "Xóa bộ lọc" while any is set. They combine.
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { CONTRACT_KINDS } from '../contract-rules';
import { CONTRACT_LIST_STATES } from '../list-api';
import type { ContractListFilters } from '../use-contract-list-filters';
import { ContractListSearch } from './contract-list-search';

const ALL = 'ALL';

export type ContractListFilterBarProps = { filters: ContractListFilters };

export function ContractListFilterBar({ filters }: ContractListFilterBarProps) {
  const { t } = useTranslation();
  const typeOptions = [
    { value: ALL, label: t('contractList.filter.allTypes') },
    ...CONTRACT_KINDS.map((kind) => ({ value: kind, label: t(`employees.profile.contracts.type.${kind}`) })),
  ];
  const stateOptions = [
    { value: ALL, label: t('contractList.filter.allStates') },
    ...CONTRACT_LIST_STATES.map((state) => ({ value: state, label: t(`contractList.state.${state}`) })),
  ];
  return (
    <div role="search" aria-label={t('contractList.filter.label')} className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
      <ContractListSearch filters={filters} className="h-11 md:h-10 md:w-72" />
      <div className="md:w-56">
        <label htmlFor="contract-list-type" className="mb-1 block text-body-small font-medium">
          {t('contractList.filter.type')}
        </label>
        <Select
          id="contract-list-type"
          value={filters.query.type}
          onChange={(value) => filters.setType(value === ALL ? '' : value)}
          placeholder={t('contractList.filter.allTypes')}
          options={typeOptions}
          className="max-md:h-11"
        />
      </div>
      <div className="md:w-48">
        <label htmlFor="contract-list-state" className="mb-1 block text-body-small font-medium">
          {t('contractList.filter.state')}
        </label>
        <Select
          id="contract-list-state"
          value={filters.query.state}
          onChange={(value) => filters.setState(value === ALL ? '' : value)}
          placeholder={t('contractList.filter.allStates')}
          options={stateOptions}
          className="max-md:h-11"
        />
      </div>
      {filters.filtered ? (
        <Button variant="ghost" size="sm" onClick={filters.clear}>
          {t('contractList.filter.clear')}
        </Button>
      ) : null}
    </div>
  );
}
