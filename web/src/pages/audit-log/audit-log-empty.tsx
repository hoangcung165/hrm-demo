// The list has no row: nothing has been recorded yet (no search, no filter), or nothing matches.
import { History, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StateBlock } from '@/components/ui/state-block';
import type { AuditFilters } from '@/features/audit/use-audit-filters';

export type AuditLogEmptyProps = { filters: AuditFilters };

export function AuditLogEmpty({ filters }: AuditLogEmptyProps) {
  const { t } = useTranslation();
  const q = filters.query.q;
  if (!filters.filtered) {
    return (
      <Card bare>
        <StateBlock variant="empty" icon={<History />} title={t('audit.empty.title')} description={t('audit.empty.text')} />
      </Card>
    );
  }
  return (
    <Card bare>
      <StateBlock
        variant="plain"
        icon={<Search />}
        title={q ? t('audit.noMatch.titleQuery', { query: q }) : t('audit.noMatch.title')}
        description={t('audit.noMatch.text')}
        actions={
          <Button variant="secondary" size="sm" onClick={filters.clear}>
            {t('audit.filter.clear')}
          </Button>
        }
      />
    </Card>
  );
}
