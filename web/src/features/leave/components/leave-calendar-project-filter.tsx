// Filter "Dự án": the people who are members of one project. "Tất cả dự án" first.
import { useTranslation } from 'react-i18next';
import { Select } from '@/components/ui/select';
import { useCalendarProjects } from '../calendar-api';

const ALL = '*';

export type LeaveCalendarProjectFilterProps = { value: string; onChange: (id: string) => void; className?: string };

export function LeaveCalendarProjectFilter({ value, onChange, className }: LeaveCalendarProjectFilterProps) {
  const { t } = useTranslation();
  const projects = useCalendarProjects(true);
  const options = [{ value: ALL, label: t('leave.calendar.filter.allProjects') }, ...(projects.data ?? []).map((project) => ({ value: project.id, label: `${project.code} · ${project.name}` }))];
  return <Select aria-label={t('leave.calendar.filter.project')} value={value || ALL} onChange={(next) => onChange(next === ALL ? '' : next)} options={options} placeholder={t('leave.calendar.filter.allProjects')} className={className} />;
}
