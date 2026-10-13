// Dự án (HRM-15): the project list. Needs PROJECT_VIEW. A PM (PROJECT_EDIT with an Employee) starts on
// "Tôi quản lý"; everyone else sees "Tất cả dự án" only. The tab, search, filters and page live in the URL.
// "Tạo dự án" (PROJECT_EDIT) sits next to the title, on desktop only.
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { useCurrentAccount } from '@/features/auth/account-context';
import { useProjectFilters } from '@/features/project/use-project-filters';
import { useMediaQuery } from '@/lib/use-media-query';
import { ProjectCreateButton } from './project-create-button';
import { ProjectListDenied } from './project-list-denied';
import { ProjectListSection } from './project-list-section';

export function ProjectsPage() {
  const { t } = useTranslation();
  const { permissions, employeeId } = useCurrentAccount();
  const compact = useMediaQuery('(max-width: 767px)');
  const canView = permissions.includes('PROJECT_VIEW');
  const canHaveMine = canView && permissions.includes('PROJECT_EDIT') && Boolean(employeeId);
  const filters = useProjectFilters(canHaveMine);
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-title">{t('projects.title')}</h1>
        {canView && !compact ? <ProjectCreateButton /> : null}
      </div>
      {canView ? <ProjectListSection filters={filters} /> : <ProjectListDenied />}
      {canView && compact ? (
        <Alert variant="info" title={t('projects.phoneNote')} />
      ) : null}
    </div>
  );
}
