import { Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { DashboardWidget } from '@/components/ui/dashboard-widget';
import { useCurrentAccount } from '@/features/auth/account-context';
import { formatDateRange } from '@/lib/format';
import { headsNoUnit, useDashboardTeam } from '../team-api';
import { TeamMemberRow } from './team-member-row';

/** Rows shown before "Xem thêm": a manager's team is small, a head of a big unit is not. */
const ROWS_SHOWN = 10;

/** "Nhóm của tôi": the members of the units the caller heads, with this week's Tải phân bổ and the leave that is coming. */
export function DashboardTeam() {
  const { t } = useTranslation();
  const { permissions } = useCurrentAccount();
  const query = useDashboardTeam();
  const [all, setAll] = useState(false);
  // An Account that heads no unit has no team, so there is no block rather than a failing one.
  if (headsNoUnit(query.error)) return null;

  const team = query.data;
  const members = team?.members ?? [];
  const rows = all ? members : members.slice(0, ROWS_SHOWN);
  const thresholds = team ? { bench: team.thresholds.benchPercent, nearFull: team.thresholds.nearFullPercent } : undefined;
  const canOpenHeatmap = permissions.includes('RESOURCE_VIEW');
  return (
    <DashboardWidget
      title={t('dashboard.team.title')}
      count={members.length}
      description={team ? t('dashboard.team.week', { range: formatDateRange(team.weekFrom, team.weekTo) }) : undefined}
      link={canOpenHeatmap ? { label: t('dashboard.team.link'), to: '/resources?tab=heatmap', ariaLabel: t('dashboard.team.linkAria') } : undefined}
      loading={query.isPending}
      error={query.isError && !query.data ? { title: t('dashboard.team.loadError'), onRetry: () => void query.refetch() } : undefined}
      empty={team && members.length === 0 ? { icon: <Users />, title: t('dashboard.team.empty.title'), text: t('dashboard.team.empty.text') } : undefined}
    >
      {thresholds ? (
        <>
          <ul aria-label={t('dashboard.team.title')}>
            {rows.map((member) => (
              <TeamMemberRow
                key={member.employee.id}
                member={member}
                thresholds={thresholds}
                heatmapTo={canOpenHeatmap ? `/resources?tab=heatmap&q=${encodeURIComponent(member.employee.fullName)}` : undefined}
              />
            ))}
          </ul>
          {members.length > ROWS_SHOWN && !all ? (
            <Button variant="ghost" size="sm" className="mt-2 max-md:h-11" onClick={() => setAll(true)}>
              {t('dashboard.team.showAll', { count: members.length - ROWS_SHOWN })}
            </Button>
          ) : null}
        </>
      ) : null}
    </DashboardWidget>
  );
}
