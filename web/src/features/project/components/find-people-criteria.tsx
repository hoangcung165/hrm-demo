// The criteria of the Tìm người drawer: the skills with their minimum levels (one to five), the range of days and
// Cần phân bổ. Errors sit under their field; nothing is submitted, the results follow the criteria.
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { SelectOption } from '@/components/ui/select';
import { SkillRequirementRow } from '@/components/ui/skill-requirement-row';
import { formatDate } from '@/lib/format';
import { SKILL_LEVELS, MAX_REQUIRED_SKILLS } from '../candidates-api';
import type { CriteriaError } from '../candidate-criteria';
import type { useFindPeople } from '../use-find-people';

export type FindPeopleCriteriaProps = { state: ReturnType<typeof useFindPeople> };

export function FindPeopleCriteria({ state }: FindPeopleCriteriaProps) {
  const { t } = useTranslation();
  const { draft, errors } = state;
  const catalog = state.skills.data ?? [];
  const chosen = new Set(draft.rows.map((row) => row.skillId).filter(Boolean));
  const levels: SelectOption[] = SKILL_LEVELS.map((level) => ({ value: String(level), label: t('projects.findPeople.fromLevel', { level }) }));
  const message = (error?: CriteriaError) =>
    error ? t(`projects.findPeople.validation.${error.key}`, { date: error.values?.date ? formatDate(error.values.date) : '' }) : undefined;

  return (
    <section aria-labelledby="find-people-criteria" className="flex flex-col gap-4 border-b border-line pb-4">
      <h3 id="find-people-criteria" className="sr-only">
        {t('projects.findPeople.criteria')}
      </h3>
      <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
        <legend className="mb-2 p-0 text-[14px] leading-5 font-medium text-ink">
          {t('projects.findPeople.skills')}
          <span aria-hidden="true" className="text-danger">
            {' '}
            *
          </span>
        </legend>
        {draft.rows.map((row, index) => {
          const name = catalog.find((each) => each.id === row.skillId)?.name;
          return (
            <SkillRequirementRow
              key={row.key}
              skillOptions={catalog.map((each) => ({ value: each.id, label: each.name, disabled: chosen.has(each.id) && each.id !== row.skillId }))}
              skillId={row.skillId}
              onSkillChange={(skillId) => state.changeRow(row.key, { skillId })}
              skillLabel={t('projects.findPeople.skillN', { n: index + 1 })}
              skillPlaceholder={t('projects.findPeople.chooseSkill')}
              levelOptions={levels}
              level={String(row.minLevel)}
              onLevelChange={(level) => state.changeRow(row.key, { minLevel: Number(level) })}
              levelLabel={name ? t('projects.findPeople.minLevelOf', { skill: name }) : t('projects.findPeople.minLevel')}
              removeLabel={name ? t('projects.findPeople.removeSkill', { skill: name }) : undefined}
              onRemove={name ? () => state.removeRow(row.key) : undefined}
            />
          );
        })}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" disabled={!state.canAdd} onClick={state.addRow}>
            <Plus aria-hidden="true" />
            {t('projects.findPeople.addSkill')}
          </Button>
          <span className="text-caption text-ink-muted">{t('projects.findPeople.skillsHint', { max: MAX_REQUIRED_SKILLS })}</span>
        </div>
      </fieldset>
      <div className="grid grid-cols-3 gap-4">
        <Field label={t('projects.findPeople.from')} required error={message(errors.from)}>
          {({ invalid, ...control }) => <Input {...control} type="date" value={draft.from} invalid={invalid} onChange={(event) => state.setFrom(event.target.value)} />}
        </Field>
        <Field label={t('projects.findPeople.to')} required error={message(errors.to)}>
          {({ invalid, ...control }) => <Input {...control} type="date" value={draft.to} invalid={invalid} onChange={(event) => state.setTo(event.target.value)} />}
        </Field>
        <Field label={t('projects.findPeople.need')} error={message(errors.need)} helper={t('projects.findPeople.needHelper')}>
          {({ invalid, ...control }) => (
            <Input
              {...control}
              inputMode="numeric"
              autoComplete="off"
              value={draft.need}
              invalid={invalid}
              placeholder={t('projects.findPeople.needPlaceholder')}
              trailing={<span className="text-ink-muted">%</span>}
              onChange={(event) => state.setNeed(event.target.value)}
            />
          )}
        </Field>
      </div>
    </section>
  );
}
