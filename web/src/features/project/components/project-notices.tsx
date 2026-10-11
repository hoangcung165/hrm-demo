// Why the project cannot be changed here: closed ("Dự án đã đóng"), or managed by another PM ("Bạn chỉ xem được dự án
// này"), shown to an Account that edits projects of its own.
import { Info, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Project } from '../api';

export type ProjectNoticesProps = {
  project: Project;
  /** PROJECT_EDIT: the caller edits some projects, so being read-only here needs saying. */
  editsProjects: boolean;
};

const BOX = 'flex gap-3 rounded-md border border-line bg-surface px-4 py-3 text-body-small';

export function ProjectNotices({ project, editsProjects }: ProjectNoticesProps) {
  const { t } = useTranslation();
  if (project.status === 'CLOSED') {
    return (
      <div role="status" className={BOX}>
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 stroke-[1.5] text-ink-muted" />
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold">{t('projects.detail.closedTitle')}</span>
          <span className="text-ink-muted">{t('projects.detail.closedText')}</span>
        </div>
      </div>
    );
  }
  if (!project.canEdit && editsProjects) {
    return (
      <div role="status" className={BOX}>
        <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0 stroke-[1.5] text-ink-muted" />
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold">{t('projects.detail.readOnlyTitle')}</span>
          <span className="text-ink-muted">{t('projects.detail.readOnlyText', { name: project.pm?.fullName ?? '' })}</span>
        </div>
      </div>
    );
  }
  return null;
}
