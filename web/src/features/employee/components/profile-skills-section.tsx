import { Award, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/use-toast';
import { removeSkill, saveSkill, skillsKey, useEmployeeSkills, type EmployeeSkill } from '../profile-qualifications-api';
import { ProfileSkillFormDialog } from './profile-skill-form-dialog';
import { ProfileRecordsState } from './profile-records-state';

export type ProfileSkillsSectionProps = {
  employeeId: string;
  canEdit: boolean;
  onDirtyChange: (value: boolean) => void;
};

export function ProfileSkillsSection({ employeeId, canEdit, onDirtyChange }: ProfileSkillsSectionProps) {
  const { t } = useTranslation();
  const k = 'employees.profile.qualifications';
  const query = useEmployeeSkills(employeeId);
  const cache = useQueryClient();
  const toast = useToast();
  const [editor, setEditor] = useState<EmployeeSkill | null | undefined>();
  const [removing, setRemoving] = useState<EmployeeSkill | null>(null);
  const [pending, setPending] = useState(false);
  const refresh = () => cache.invalidateQueries({ queryKey: skillsKey(employeeId) });
  const remove = async () => {
    if (!removing || pending) return;
    setPending(true);
    try {
      await removeSkill(employeeId, removing.id);
      await refresh(); setRemoving(null);
      toast({ variant: 'success', message: t(`${k}.skillDeleted`) });
    } catch { toast({ variant: 'danger', message: t(`${k}.deleteFailed`) }); }
    finally { setPending(false); }
  };
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-heading">{t('employees.profile.tab.skills')}</h2>
        {canEdit ? <Button onClick={() => setEditor(null)}><Plus aria-hidden="true" />{t(`${k}.addSkill`)}</Button> : null}
      </div>
      <ProfileRecordsState query={query} section="skills">
        {query.data?.length ? (
          <Card bare>
            <ul className="divide-y divide-line">
              {query.data.map(record => (
                <li key={record.id} className="flex flex-wrap items-center gap-3 px-4 py-4 md:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{record.skill.name}</p>
                    {record.skill.code ? <p className="text-caption text-ink-muted">{record.skill.code}</p> : null}
                  </div>
                  <Badge variant="info">{t(`${k}.levelValue`, { level: record.level })}</Badge>
                  {canEdit ? <div className="flex gap-2">
                    <Button size="sm" variant="secondary" disabled={pending} aria-label={t(`${k}.editNamed`, { name: record.skill.name })}
                      onClick={() => setEditor(record)}><Pencil aria-hidden="true" />{t('employees.profile.edit')}</Button>
                    <Button size="sm" variant="secondary" disabled={pending} aria-label={t(`${k}.deleteNamed`, { name: record.skill.name })}
                      onClick={() => setRemoving(record)}><Trash2 aria-hidden="true" />{t(`${k}.delete`)}</Button>
                  </div> : null}
                </li>
              ))}
            </ul>
          </Card>
        ) : <Card bare><EmptyState icon={<Award />} title={t(`${k}.skillsEmpty`)}
          description={t(`${k}.skillsEmptyText`)} /></Card>}
      </ProfileRecordsState>
      {editor !== undefined ? <ProfileSkillFormDialog key={editor?.id ?? 'new'} record={editor}
        usedSkillIds={query.data?.map(each => each.skill.id) ?? []} onDirty={onDirtyChange}
        onClose={() => { onDirtyChange(false); setEditor(undefined); }}
        onSave={async body => {
          await saveSkill(employeeId, body, editor?.id);
          await refresh();
          toast({ variant: 'success', message: t(`${k}.skillSaved`) });
        }} /> : null}
      <ConfirmDialog open={removing !== null} title={t(`${k}.deleteNamed`, { name: removing?.skill.name ?? '' })}
        description={t(`${k}.deleteHint`)} confirmLabel={t(`${k}.delete`)} pending={pending}
        onCancel={() => { if (!pending) setRemoving(null); }} onConfirm={() => void remove()} />
    </section>
  );
}
