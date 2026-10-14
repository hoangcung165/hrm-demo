import { useEffect, useId, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';

export function ProfileNationalityCard({ employeeId, canEdit, onDirtyChange }: {
  employeeId: string; canEdit: boolean; onDirtyChange: (dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const k = 'employees.profile.nationality';
  const cache = useQueryClient();
  const toast = useToast();
  const key = ['employees', 'nationality', employeeId] as const;
  const query = useQuery({ queryKey:key,
    queryFn:()=>api<{nationality:string|null}>(`/api/employees/${employeeId}/nationality`) });
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const formId = useId();
  const saved = query.data?.nationality ?? '';
  const dirty = value !== saved;
  useEffect(() => onDirtyChange(editing && dirty), [editing, dirty, onDirtyChange]);
  const open = () => { setValue(saved); setError(''); setEditing(true); };
  const close = () => { if (!busy) { onDirtyChange(false); setEditing(false); } };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nationality = value.trim().toUpperCase();
    if (nationality && !/^[A-Z]{2}$/.test(nationality)) {
      setError(t(`${k}.invalid`)); return;
    }
    setBusy(true); setError('');
    try {
      await api(`/api/employees/${employeeId}/nationality`, {
        method:'PUT', body:{nationality:nationality || null},
      });
      await cache.invalidateQueries({queryKey:key});
      toast({variant:'success',message:t(`${k}.saved`)});
      onDirtyChange(false); setEditing(false);
    } catch { setError(t(`${k}.failed`)); }
    finally { setBusy(false); }
  };
  return (
    <>
      <Card title={t(`${k}.title`)}
        titleAside={canEdit ? <Button size="sm" variant="secondary" onClick={open}
          aria-label={t(`${k}.edit`)}>{t('employees.profile.edit')}</Button> : undefined}>
        {query.isPending ? <p role="status">{t('employees.profile.loading')}</p> : query.isError ? (
          <ErrorState title={t(`${k}.failed`)} onRetry={() => void query.refetch()} />
        ) : (
          <p className="text-body-strong">{saved || t('employees.none')}</p>
        )}
      </Card>
      {editing ? <Dialog open onOpenChange={next => { if (!next && !dirty) close(); }}
        title={t(`${k}.edit`)} busy={busy} footer={<>
          <Button variant="secondary" onClick={close} disabled={busy}>{t('dialog.cancel')}</Button>
          <Button form={formId} type="submit" disabled={busy}>{t(`${k}.save`)}</Button>
        </>}>
        <form id={formId} onSubmit={e => void submit(e)} className="flex flex-col gap-3" noValidate>
          <label className="flex flex-col gap-1 text-sm font-medium">
            {t(`${k}.title`)}
            <Input maxLength={2} value={value} onChange={e => { setValue(e.target.value.toUpperCase()); setError(''); }}
              placeholder="VN" />
          </label>
          <p className="text-caption text-ink-muted">{t(`${k}.hint`)}</p>
          {error ? <p role="alert" className="text-caption text-danger">{error}</p> : null}
        </form>
      </Dialog> : null}
    </>
  );
}
