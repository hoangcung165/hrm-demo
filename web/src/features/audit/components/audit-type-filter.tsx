// Filter "Đối tượng": every kind of record (the default) or one registered kind.
import { useTranslation } from 'react-i18next';
import { Select } from '@/components/ui/select';
import { useAuditEntityTypes } from '../api';
import type { AuditFilters } from '../use-audit-filters';
import { useAuditLabels } from '../use-audit-labels';

const ALL = 'ALL';

export type AuditTypeFilterProps = { filters: AuditFilters; id?: string; disabled?: boolean; className?: string };

export function AuditTypeFilter({ filters, id, disabled, className }: AuditTypeFilterProps) {
  const { t } = useTranslation();
  const labels = useAuditLabels();
  const types = useAuditEntityTypes();
  const current = filters.query.entityType;
  const known = types.data ?? [];
  // A kind in the URL that is no longer registered still shows, so the filter says what the list is limited to.
  const options = [
    { value: ALL, label: t('audit.filter.allTypes') },
    ...known.map((type) => ({ value: type.key, label: labels.entityType(type.key, type.label) })),
    ...(current && !known.some((type) => type.key === current) ? [{ value: current, label: labels.entityType(current) }] : []),
  ];
  return (
    <Select
      id={id}
      aria-label={id ? undefined : t('audit.filter.type')}
      value={current || ALL}
      onChange={(value) => filters.setEntityType(value === ALL ? '' : value)}
      options={options}
      placeholder={t('audit.filter.allTypes')}
      disabled={disabled}
      className={className}
    />
  );
}
