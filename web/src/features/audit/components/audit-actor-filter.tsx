// Filter "Người sửa": everyone (the default) or one person who appears in the log.
import { useTranslation } from 'react-i18next';
import { Select } from '@/components/ui/select';
import { useAuditActors } from '../api';
import type { AuditFilters } from '../use-audit-filters';
import { useAuditLabels } from '../use-audit-labels';

const ALL = 'ALL';

export type AuditActorFilterProps = { filters: AuditFilters; id?: string; disabled?: boolean; className?: string };

export function AuditActorFilter({ filters, id, disabled, className }: AuditActorFilterProps) {
  const { t } = useTranslation();
  const labels = useAuditLabels();
  const actors = useAuditActors();
  const current = filters.query.actorId;
  const known = actors.data ?? [];
  const options = [
    { value: ALL, label: t('audit.filter.allPeople') },
    ...known.map((actor) => ({ value: actor.id, label: labels.actor(actor.name, actor.id) })),
    ...(current && !known.some((actor) => actor.id === current) ? [{ value: current, label: t('audit.unknownPerson') }] : []),
  ];
  return (
    <Select
      id={id}
      aria-label={id ? undefined : t('audit.filter.person')}
      value={current || ALL}
      onChange={(value) => filters.setActor(value === ALL ? '' : value)}
      options={options}
      placeholder={t('audit.filter.allPeople')}
      disabled={disabled}
      className={className}
    />
  );
}
