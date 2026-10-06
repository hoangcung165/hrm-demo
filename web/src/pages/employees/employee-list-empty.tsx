// The list has no row: the company has no Employee yet (no search, default filters), or nothing matches.
import { Plus, Search, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StateBlock } from '@/components/ui/state-block';
import type { EmployeeFilters } from '@/features/employee/use-employee-filters';
import { useEmployeeFilterSummary } from '@/features/employee/use-employee-filter-summary';

export type EmployeeListEmptyProps = {
  filters: EmployeeFilters;
  unitFilter: boolean;
  canAdd: boolean;
};

export function EmployeeListEmpty({ filters, unitFilter, canAdd }: EmployeeListEmptyProps) {
  const { t } = useTranslation();
  const summary = useEmployeeFilterSummary(filters, unitFilter);
  const q = filters.query.q;
  if (!filters.filtered) {
    return (
      <Card bare>
        <StateBlock
          variant="empty"
          icon={<Users />}
          title={t('employees.empty.title')}
          description={t(canAdd ? 'employees.empty.text' : 'employees.empty.textReadOnly')}
          actions={
            canAdd ? (
              <Link to="/employees/new" className={buttonVariants({ size: 'sm' })}>
                <Plus aria-hidden="true" className="!size-4" />
                {t('employees.add')}
              </Link>
            ) : undefined
          }
        />
      </Card>
    );
  }
  return (
    <Card bare>
      <StateBlock
        variant="plain"
        icon={<Search />}
        title={q ? t('employees.noMatch.titleQuery', { query: q }) : t('employees.noMatch.title')}
        description={summary ? t('employees.noMatch.textFilters', { filters: summary }) : t('employees.noMatch.text')}
        actions={
          <Button variant="secondary" size="sm" onClick={filters.clear}>
            {t('employees.filter.clear')}
          </Button>
        }
      />
    </Card>
  );
}
