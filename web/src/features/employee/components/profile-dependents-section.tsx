// HRM-08/FE-2A: dependent records with effective tax dates and authorized editing.
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DetailList } from '@/components/ui/detail-list';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/format';
import { useEmployeeDependents, profileRecordsKey, type Dependent } from '../profile-records-api';
import { saveDependent, removeDependent, type DependentBody } from '../profile-records-write';
import { ProfileDependentFormDialog } from './profile-dependent-form-dialog';
import { ProfileRecordsEmpty, ProfileRecordsState } from './profile-records-state';

export function ProfileDependentsSection({ employeeId, canEdit = false, onDirtyChange = () => {} }: {
  employeeId: string; canEdit?: boolean; onDirtyChange?: (dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const key = 'employees.profile.records.edit';
  const query = useEmployeeDependents(employeeId);
  const cache = useQueryClient();
  const toast = useToast();
  const [editor, setEditor] = useState<Dependent | null | undefined>();
  const [removing, setRemoving] = useState<Dependent | null>(null);
  const [pending, setPending] = useState(false);
  const date = (value: string | null) => value ? <span className="tabular-nums">{formatDate(value)}</span>
    : <span className="text-ink-muted">{t('employees.none')}</span>;
  const refresh = async () => cache.invalidateQueries({ queryKey: profileRecordsKey(employeeId, 'dependents') });
  const save = async (value: DependentBody) => {
    await saveDependent(employeeId, value, editor?.id);
    await refresh();
    toast({ variant: 'success', message: t(`${key}.saved`) });
  };
  const deleteDependent = async () => {
    if (!removing || pending) return;
    setPending(true);
    try {
      await removeDependent(employeeId, removing.id);
      await refresh();
      setRemoving(null);
      toast({ variant: 'success', message: t(`${key}.deleted`) });
    } catch {
      toast({ variant: 'error', message: t(`${key}.deleteFailed`) });
    } finally { setPending(false); }
  };
  return (
    <ProfileRecordsState query={query} section="dependents">
      <div className="flex flex-col gap-4">
        {canEdit ? (
          <div className="flex justify-end">
            <Button onClick={() => setEditor(null)}><Plus aria-hidden="true" /> {t(`${key}.dependentAdd`)}</Button>
          </div>
        ) : null}
        {query.data?.length === 0 ? (
          <ProfileRecordsEmpty section="dependents" icon={<Users />} />
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-2">
            {query.data?.map(dependent => (
              <Card key={dependent.id} title={dependent.fullName}
                actions={canEdit ? (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => setEditor(dependent)} disabled={pending}
                      aria-label={t(`${key}.editNamed`, { name: dependent.fullName })}>
                      <Pencil aria-hidden="true" />{t('employees.profile.edit')}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setRemoving(dependent)} disabled={pending}
                      aria-label={t(`${key}.deleteNamed`, { name: dependent.fullName })}>
                      <Trash2 aria-hidden="true" />{t(`${key}.delete`)}
                    </Button>
                  </>
                ) : undefined}>
                <DetailList items={[
                  { label: t('employees.profile.records.dependents.relationship'), value: dependent.relationship },
                  { label: t('employees.profile.records.dependents.dateOfBirth'), value: date(dependent.dateOfBirth) },
                  { label: t('employees.profile.records.dependents.from'), value: date(dependent.effectiveFrom) },
                  { label: t('employees.profile.records.dependents.to'), value: dependent.effectiveTo
                    ? date(dependent.effectiveTo) : t('employees.profile.records.dependents.ongoing') },
                ]} />
              </Card>
            ))}
          </div>
        )}
        {editor !== undefined ? (
          <ProfileDependentFormDialog key={editor?.id ?? 'new'} open record={editor} onDirty={onDirtyChange}
            onClose={() => { onDirtyChange(false); setEditor(undefined); }} onSave={save} />
        ) : null}
        <ConfirmDialog open={removing !== null} title={t(`${key}.deleteNamed`, { name: removing?.fullName ?? '' })}
          description={t(`${key}.deleteHint`)} confirmLabel={t(`${key}.delete`)}
          pending={pending} onCancel={() => { if (!pending) setRemoving(null); }}
          onConfirm={() => void deleteDependent()} />
      </div>
    </ProfileRecordsState>
  );
}
