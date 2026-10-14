// The Dự án tab of the Employee profile (#17 `Hồ sơ nhân viên (Dự án)`): the 12-week load strip, then the history of
// the person's allocations. Read-only: allocations are changed on the project.
import { Briefcase } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { DEFAULT_HEAT_THRESHOLDS } from '@/components/ui/heat-cell';
import { EmptyState } from '@/components/ui/empty-state';
import { useCurrentAccount } from '@/features/auth/account-context';
import { useResourceSettings } from '@/features/resource/settings-api';
import { useMediaQuery } from '@/lib/use-media-query';
import { useEmployeeProjects } from '../profile-projects-api';
import { ProfileLoadStrip } from './profile-load-strip';
import { ProfileProjectHistory } from './profile-project-history';
import { ProfileRecordsState } from './profile-records-state';

export type ProfileProjectsSectionProps = { employeeId: string; fullName: string; code: string };

export function ProfileProjectsSection({ employeeId, fullName, code }: ProfileProjectsSectionProps) {
  const { t } = useTranslation();
  const { permissions } = useCurrentAccount();
  const compact = useMediaQuery('(max-width: 767px)');
  const query = useEmployeeProjects(employeeId);
  const canOpenHeatmap = permissions.includes('RESOURCE_VIEW');
  // The strip is coloured like the heatmap, by the company's thresholds; whoever cannot read them sees the defaults.
  const settings = useResourceSettings(canOpenHeatmap);
  const thresholds = settings.data ? { bench: settings.data.benchPercent, nearFull: settings.data.nearFullPercent } : DEFAULT_HEAT_THRESHOLDS;
  const { data } = query;
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-heading">{t('employees.profile.tab.projects')}</h2>
      <ProfileRecordsState query={query} section="projects">
        {data ? (
          <>
            <ProfileLoadStrip strip={data.strip} fullName={fullName} code={code} thresholds={thresholds} canOpenHeatmap={canOpenHeatmap} />
            <section aria-labelledby="profile-project-history" className="flex flex-col gap-3">
              <h3 id="profile-project-history" className="text-body-strong">
                {t('employees.profile.projects.history')}
              </h3>
              {data.items.length > 0 ? (
                <ProfileProjectHistory rows={data.items} caption={t('employees.profile.projects.caption', { name: fullName })} compact={compact} linkToProject={permissions.includes('PROJECT_VIEW')} />
              ) : (
                <Card bare>
                  <EmptyState icon={<Briefcase aria-hidden="true" />} title={t('employees.profile.projects.emptyTitle')} description={t('employees.profile.projects.emptyText', { name: fullName })} />
                </Card>
              )}
            </section>
          </>
        ) : null}
      </ProfileRecordsState>
    </section>
  );
}
