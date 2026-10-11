// "Thành viên" column: running and upcoming members, with "n quá tải" under them; "Chưa có ai" when nobody is allocated
// yet, "Không còn ai" on a closed project.
import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/lib/format';
import type { ProjectMembers, ProjectStatus } from '../api';
import { ProjectOverloadBadge } from './project-overload-badge';

export type ProjectMembersCellProps = { members: ProjectMembers; status: ProjectStatus };

export function ProjectMembersCell({ members, status }: ProjectMembersCellProps) {
  const { t } = useTranslation();
  const count = members.running + members.upcoming;
  if (count === 0) return <span className="text-ink-muted">{t(status === 'CLOSED' ? 'projects.members.noneLeft' : 'projects.members.none')}</span>;
  return (
    <span className="flex flex-col items-start gap-0.5">
      <span className="tabular-nums">{t('projects.members.count', { count, number: formatNumber(count) })}</span>
      <ProjectOverloadBadge count={members.overloaded} />
    </span>
  );
}
