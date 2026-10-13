// Chi tiết dự án (HRM-15, pattern P3): the breadcrumb, title and status, the facts, the notices (closed, or another
// PM's project), and the members with their Tải phân bổ. Needs PROJECT_VIEW. "Sửa dự án" and "Phân bổ nhân sự" for
// whoever may edit it, on desktop only.
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { useCurrentAccount } from '@/features/auth/account-context';
import { useProject } from '@/features/project/api';
import { AllocationActionsProvider } from '@/features/project/components/allocation-actions';
import { ProjectNotices } from '@/features/project/components/project-notices';
import { ProjectStatusBadge } from '@/features/project/components/project-status-badge';
import { ProjectSummaryCard } from '@/features/project/components/project-summary-card';
import { ApiError } from '@/lib/api';
import { useMediaQuery } from '@/lib/use-media-query';
import { ProjectDetailState } from './project-detail-state';
import { ProjectAllocateButton } from './project-allocate-button';
import { ProjectEditButton } from './project-edit-button';
import { ProjectMembersSection } from './project-members-section';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ProjectDetailPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const { permissions } = useCurrentAccount();
  const canView = permissions.includes('PROJECT_VIEW');
  const compact = useMediaQuery('(max-width: 767px)');
  const known = UUID.test(id);
  const project = useProject(id, known && canView);
  const status = project.error instanceof ApiError ? project.error.status : null;
  const { data } = project;

  const crumbs = (
    <nav aria-label={t('projects.detail.breadcrumb')} className="flex items-center gap-2 text-caption font-normal text-ink-muted">
      <Link to="/projects" className="rounded-sm">
        {t('projects.title')}
      </Link>
      {data ? (
        <>
          <ChevronRight aria-hidden="true" className="size-3.5 stroke-[1.5]" />
          <span aria-current="page" className="tabular-nums">
            {data.code}
          </span>
        </>
      ) : null}
    </nav>
  );

  let content;
  if (!canView || status === 403) content = <ProjectDetailState state="denied" />;
  else if (!known || status === 404) content = <ProjectDetailState state="notFound" />;
  else if (project.isError) content = <ProjectDetailState state="error" onRetry={() => void project.refetch()} />;
  else if (!data) content = <ProjectDetailState state="loading" />;
  else {
    content = (
      <AllocationActionsProvider project={data}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-title">{data.name}</h1>
              <ProjectStatusBadge status={data.status} />
            </div>
            <span className="text-ink-muted tabular-nums">{`${data.code} · ${data.client ?? t('projects.internal')}`}</span>
          </div>
          {compact ? null : (
            <div className="flex flex-wrap gap-2">
              <ProjectEditButton project={data} />
              <ProjectAllocateButton />
            </div>
          )}
        </div>
        <ProjectSummaryCard project={data} />
        <ProjectNotices project={data} editsProjects={permissions.includes('PROJECT_EDIT')} />
        <ProjectMembersSection project={data} />
      </AllocationActionsProvider>
    );
  }
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {crumbs}
      {content}
    </div>
  );
}
