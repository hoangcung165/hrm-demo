// How the Audit log names what it shows: the kind of record and its fields in the UI language (the server only knows
// them by key and in English), the person (or "Hệ thống" when no Account made the change), and a recorded value.
import { useTranslation } from 'react-i18next';
import { formatExactNumber } from '@/lib/format';

/** What the server stores in place of a masked value. */
export const MASK = '***';

export function useAuditLabels() {
  const { t } = useTranslation();
  return {
    /** "Ngưỡng nguồn lực"; a kind the screen has no translation for keeps the server's label, then its key. */
    entityType: (key: string, serverLabel?: string) => t(`audit.entityType.${key}`, { defaultValue: serverLabel || key }),
    /** "Ngưỡng Bench (%)"; an unknown field keeps its name. */
    field: (entityType: string, name: string) => t(`audit.field.${entityType}.${name}`, { defaultValue: name }),
    actor: (name: string | null, actorId: string | null) => name ?? (actorId ? t('audit.unknownPerson') : t('audit.system')),
    /** A value as recorded: numbers in Vietnamese format, yes / no, "—" for none; anything else as text. */
    value: (value: unknown): string => {
      if (value === null || value === undefined || value === '') return '—';
      if (typeof value === 'number') return formatExactNumber(value);
      if (typeof value === 'boolean') return t(value ? 'audit.yes' : 'audit.no');
      if (typeof value === 'string') return value;
      return JSON.stringify(value);
    },
  };
}

export type AuditLabels = ReturnType<typeof useAuditLabels>;
