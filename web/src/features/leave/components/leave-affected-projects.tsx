// The projects the sender is a member of during the days off (artboard `#18 Duyệt đơn nghỉ`), so the approver sees
// what the leave touches. Empty for a person who only reads the request as a CC, so nothing is drawn then.
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import type { LeaveProjectRef } from '../api';

export type LeaveAffectedProjectsProps = { projects: LeaveProjectRef[]; name: string };

export function LeaveAffectedProjects({ projects, name }: LeaveAffectedProjectsProps) {
  const { t } = useTranslation();
  if (!projects.length) return null;
  return (
    <Card title={t('leave.approval.projectsTitle')}>
      <p className="mb-2 text-body-small text-ink-muted">{t('leave.approval.projectsText', { name })}</p>
      <ul className="flex flex-col divide-y divide-line">
        {projects.map((project) => (
          <li key={project.id} className="flex flex-wrap items-baseline gap-x-3 py-2 first:pt-0 last:pb-0">
            <span className="font-semibold tabular-nums">{project.code}</span>
            <span className="min-w-0 [overflow-wrap:anywhere]">{project.name}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
