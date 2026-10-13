// Editing a project: when the new dates no longer hold some running or upcoming allocations, say whose before saving.
// On save the backend cuts them to the new dates and deletes the ones left with no day inside.
import { useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { formatDateRange, formatNumber } from '@/lib/format';
import { useAllocations, type Allocation, type Project } from '../api';
import type { ProjectFormValues } from '../schemas';

const NAMES_SHOWN = 3;

/** The allocations that the range `start`–`end` would cut; empty while a date is missing or the range is reversed. */
export function cutAllocations(items: Allocation[], start: string, end: string): Allocation[] {
  if (!start || !end || end < start) return [];
  return items.filter((allocation) => allocation.startDate < start || allocation.endDate > end);
}

export function ProjectShortenWarning({ project }: { project: Project }) {
  const { t } = useTranslation();
  const [start, end] = useWatch<ProjectFormValues, ['startDate', 'endDate']>({ name: ['startDate', 'endDate'] });
  const shortened = start > project.startDate || end < project.endDate;
  const allocations = useAllocations(project.id, false, shortened);
  if (!shortened || !allocations.data) return null;
  const cut = cutAllocations(allocations.data.items, start, end);
  if (cut.length === 0) return null;
  const names = [...new Set(cut.map((allocation) => allocation.employee?.fullName).filter(Boolean))] as string[];
  const listed = names.slice(0, NAMES_SHOWN).join(', ');
  const more = names.length - NAMES_SHOWN;
  return (
    <Alert variant="warning" title={t('projects.form.shortenTitle', { count: cut.length, number: formatNumber(cut.length) })}>
      {t('projects.form.shortenText', { names: more > 0 ? t('projects.form.namesMore', { names: listed, count: more, number: formatNumber(more) }) : listed, range: formatDateRange(start, end) })}
    </Alert>
  );
}
