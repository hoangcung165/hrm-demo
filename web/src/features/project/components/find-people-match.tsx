// One person in the Tìm người result: who, % còn trống (with "Thiếu …" or "Quá tải …" when it matters), the skills
// against what the project asked for, approved leave in the range, and the load of each month.
import { TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { FreeFigure } from '@/components/ui/free-figure';
import { LoadStrip } from '@/components/ui/load-strip';
import { MatchRow } from '@/components/ui/match-row';
import { Person } from '@/components/ui/person';
import { SkillChip } from '@/components/ui/skill-chip';
import { formatDayMonth, formatPercent } from '@/lib/format';
import type { CandidateSkill, ProjectCandidate } from '../candidates-api';

/** "11/26" for `2026-11`. */
const monthLabel = (month: string) => `${month.slice(5)}/${month.slice(2, 4)}`;
const leaveRange = (from: string, to: string) => (from === to ? formatDayMonth(from) : `${formatDayMonth(from)} – ${formatDayMonth(to)}`);

function Skill({ skill }: { skill: CandidateSkill }) {
  const { t } = useTranslation();
  if (skill.level === null) return <SkillChip state="missing" name={t('projects.findPeople.skillMissing', { skill: skill.name })} />;
  if (skill.met) return <SkillChip state="met" name={skill.name} detail={t('projects.findPeople.levelMet', { level: skill.level })} />;
  return <SkillChip state="below" name={skill.name} detail={t('projects.findPeople.levelBelow', { level: skill.level, min: skill.minLevel })} />;
}

export type FindPeopleMatchProps = { candidate: ProjectCandidate; need: number | null };

export function FindPeopleMatch({ candidate, need }: FindPeopleMatchProps) {
  const { t } = useTranslation();
  const { employee } = candidate;
  const short = need !== null && candidate.freePercent < need ? need - candidate.freePercent : 0;
  const note = candidate.overloaded ? (
    <Badge variant="danger" className="whitespace-nowrap">
      <TriangleAlert aria-hidden="true" />
      {t('projects.findPeople.over', { percent: formatPercent(candidate.peakLoad) })}
    </Badge>
  ) : short > 0 ? (
    <Badge variant="warning" className="whitespace-nowrap">
      {t('projects.findPeople.short', { percent: formatPercent(short) })}
    </Badge>
  ) : (
    t('projects.findPeople.free')
  );
  const caption = [employee.positionName, employee.orgUnitName].filter(Boolean).join(' · ');
  return (
    <MatchRow
      person={
        <Link to={`/employees/${employee.id}`} className="block rounded-sm hover:text-brand-blue focus-visible:shadow-focus-ring">
          <Person name={employee.fullName} caption={caption || employee.code} />
        </Link>
      }
      free={<FreeFigure percent={candidate.freePercent} label={t('projects.findPeople.freeLabel', { percent: formatPercent(candidate.freePercent) })} note={note} />}
      skills={
        <>
          {candidate.skills.map((skill) => (
            <Skill key={skill.skillId} skill={skill} />
          ))}
          {candidate.approvedLeave.map((leave) => (
            <Badge key={`${leave.from}-${leave.to}`} variant="info" className="whitespace-nowrap">
              {t('projects.findPeople.leave', { range: leaveRange(leave.from, leave.to) })}
            </Badge>
          ))}
        </>
      }
      strip={
        candidate.months.length > 0 ? (
          <LoadStrip
            label={t('projects.findPeople.monthStrip')}
            months={candidate.months.map((month) => ({
              key: month.month,
              label: monthLabel(month.month),
              percent: month.peakPercent,
              ariaLabel: t(month.peakPercent > 100 ? 'projects.findPeople.monthLoadOver' : 'projects.findPeople.monthLoad', { month: `${month.month.slice(5)}/${month.month.slice(0, 4)}`, percent: formatPercent(month.peakPercent) }),
            }))}
          />
        ) : null
      }
    />
  );
}
